/**
 * OpenAI Client implementation
 */
import * as z from 'zod/v4'

import { InvokeError, InvokeErrorTypes } from './errors'
import type { InvokeOptions, InvokeResult, LLMClient, LLMConfig, Message, Tool } from './types'
import { modelPatch, zodToOpenAITool } from './utils'

/**
 * Client for OpenAI compatible APIs
 */
export class OpenAIClient implements LLMClient {
	config: Required<LLMConfig>
	private fetch: typeof globalThis.fetch

	constructor(config: Required<LLMConfig>) {
		this.config = config
		this.fetch = config.customFetch
	}

	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		// 1. Convert tools to OpenAI format
		const openaiTools = Object.entries(tools).map(([name, t]) => zodToOpenAITool(name, t))

		// Groq strictly validates that every tool name returned by the model exists in
		// request.tools. Some Groq models ignore the macro/AgentOutput wrapper and call the
		// nested action tools directly, which then fails server-side before our autoFixer
		// can rewrap the call. Mirror the nested action names as dummy tool entries so Groq
		// accepts the response; normalizeResponse repacks it into AgentOutput downstream.
		if (/groq\.com/i.test(this.config.baseURL)) {
			expandMacroToolForGroq(openaiTools)
		}

		// Build request body

		let toolChoice: unknown = 'required'
		if (options?.toolChoiceName && !this.config.disableNamedToolChoice) {
			toolChoice = { type: 'function', function: { name: options.toolChoiceName } }
		}

		const requestBody: Record<string, unknown> = {
			model: this.config.model,
			temperature: this.config.temperature,
			messages,
			tools: openaiTools,
			parallel_tool_calls: false,
			tool_choice: toolChoice,
		}

		modelPatch(requestBody)
		let transformedBody: Record<string, unknown> | undefined
		try {
			transformedBody = this.config.transformRequestBody(requestBody)
		} catch (error) {
			throw new InvokeError(
				InvokeErrorTypes.CONFIG_ERROR,
				`transformRequestBody failed: ${(error as Error).message}`,
				error
			)
		}
		const finalRequestBody = transformedBody ?? requestBody

		// 2. Call API
		let response: Response
		try {
			response = await this.fetch(`${this.config.baseURL}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
				},
				body: JSON.stringify(finalRequestBody),
				signal: abortSignal,
			})
		} catch (error: unknown) {
			const isAbortError = (error as any)?.name === 'AbortError'
			const errorMessage = isAbortError ? 'Network request aborted' : 'Network request failed'
			if (!isAbortError) console.error(error)
			throw new InvokeError(InvokeErrorTypes.NETWORK_ERROR, errorMessage, error)
		}

		// 3. Handle HTTP errors
		if (!response.ok) {
			const errorData = await response.json().catch()
			const errorMessage =
				(errorData as { error?: { message?: string } }).error?.message || response.statusText

			if (response.status === 401 || response.status === 403) {
				throw new InvokeError(
					InvokeErrorTypes.AUTH_ERROR,
					`Authentication failed: ${errorMessage}`,
					errorData
				)
			}
			if (response.status === 402 || isQuotaError(response.status, errorData, errorMessage)) {
				throw new InvokeError(
					InvokeErrorTypes.QUOTA_EXCEEDED,
					`Quota exceeded: ${errorMessage}`,
					errorData
				)
			}
			if (response.status === 429) {
				throw new InvokeError(
					InvokeErrorTypes.RATE_LIMIT,
					`Rate limit exceeded: ${errorMessage}`,
					errorData
				)
			}
			if (response.status >= 500) {
				throw new InvokeError(
					InvokeErrorTypes.SERVER_ERROR,
					`Server error: ${errorMessage}`,
					errorData
				)
			}
			throw new InvokeError(
				InvokeErrorTypes.UNKNOWN,
				`HTTP ${response.status}: ${errorMessage}`,
				errorData
			)
		}

		// 4. Parse and validate response
		const data = await response.json()

		const choice = data.choices?.[0]
		if (!choice) {
			throw new InvokeError(InvokeErrorTypes.UNKNOWN, 'No choices in response', data)
		}

		// Check finish_reason
		switch (choice.finish_reason) {
			case 'tool_calls':
			case 'function_call': // gemini
			case 'stop': // some models use this even with tool calls
				break
			case 'length':
				throw new InvokeError(
					InvokeErrorTypes.CONTEXT_LENGTH,
					'Response truncated: max tokens reached',
					undefined,
					data
				)
			case 'content_filter':
				throw new InvokeError(
					InvokeErrorTypes.CONTENT_FILTER,
					'Content filtered by safety system',
					undefined,
					data
				)
			default:
				throw new InvokeError(
					InvokeErrorTypes.UNKNOWN,
					`Unexpected finish_reason: ${choice.finish_reason}`,
					undefined,
					data
				)
		}

		// Apply normalizeResponse if provided (for fixing format issues automatically)
		const normalizedData = options?.normalizeResponse ? options.normalizeResponse(data) : data
		const normalizedChoice = (normalizedData as any).choices?.[0]

		// Get tool name from response
		const toolCallName = normalizedChoice?.message?.tool_calls?.[0]?.function?.name
		if (!toolCallName) {
			throw new InvokeError(
				InvokeErrorTypes.NO_TOOL_CALL,
				'No tool call found in response',
				undefined,
				data
			)
		}

		const tool = tools[toolCallName]
		if (!tool) {
			throw new InvokeError(
				InvokeErrorTypes.UNKNOWN,
				`Tool "${toolCallName}" not found in tools`,
				undefined,
				data
			)
		}

		// Extract and parse tool arguments
		const argString = normalizedChoice.message?.tool_calls?.[0]?.function?.arguments
		if (!argString) {
			throw new InvokeError(
				InvokeErrorTypes.INVALID_TOOL_ARGS,
				'No tool call arguments found',
				undefined,
				data
			)
		}

		let parsedArgs: unknown
		try {
			parsedArgs = JSON.parse(argString)
		} catch (error) {
			throw new InvokeError(
				InvokeErrorTypes.INVALID_TOOL_ARGS,
				'Failed to parse tool arguments as JSON',
				error,
				data
			)
		}

		// Validate with schema
		const validation = tool.inputSchema.safeParse(parsedArgs)
		if (!validation.success) {
			console.error(z.prettifyError(validation.error))
			throw new InvokeError(
				InvokeErrorTypes.INVALID_TOOL_ARGS,
				'Tool arguments validation failed',
				validation.error,
				data
			)
		}
		const toolInput = validation.data

		// 5. Execute tool
		let toolResult: unknown
		try {
			toolResult = await tool.execute(toolInput)
		} catch (e) {
			throw new InvokeError(
				InvokeErrorTypes.TOOL_EXECUTION_ERROR,
				`Tool execution failed: ${(e as Error).message}`,
				e,
				data
			)
		}

		// Return result
		return {
			toolCall: {
				name: toolCallName,
				args: toolInput,
			},
			toolResult,
			usage: {
				promptTokens: data.usage?.prompt_tokens ?? 0,
				completionTokens: data.usage?.completion_tokens ?? 0,
				totalTokens: data.usage?.total_tokens ?? 0,
				cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
				reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
			},
			rawResponse: data,
			rawRequest: finalRequestBody,
		}
	}
}

const QUOTA_ERROR_CODES = new Set([
	'insufficient_quota',
	'insufficient_credit',
	'insufficient_credits',
	'credit_exhausted',
	'credits_exhausted',
	'billing_hard_limit_reached',
	'billing_not_active',
	'account_deactivated',
	'quota_exceeded',
])

const QUOTA_HINT_PATTERN =
	/insufficient[_\s-]?(quota|credit|credits|funds|balance)|exceeded your (current )?quota|out of (credit|credits|free credits)|billing (issue|limit|hard limit)|payment required|please add (a )?payment|free tier (limit|quota)/i

function isQuotaError(status: number, errorData: unknown, errorMessage: string): boolean {
	const err = (errorData as { error?: { code?: string; type?: string; message?: string } } | null)
		?.error
	const code = err?.code?.toLowerCase()
	const type = err?.type?.toLowerCase()
	if (code && QUOTA_ERROR_CODES.has(code)) return true
	if (type && QUOTA_ERROR_CODES.has(type)) return true
	if (status === 429 && QUOTA_HINT_PATTERN.test(errorMessage)) return true
	return false
}

type OpenAITool = ReturnType<typeof zodToOpenAITool>

/**
 * For each macro tool whose parameters expose an `action` union of single-key objects
 * (PageAgentCore's AgentOutput shape), append a dummy tool entry per nested action name.
 * Mutates the array in place.
 */
function expandMacroToolForGroq(openaiTools: OpenAITool[]): void {
	const seen = new Set(openaiTools.map((t) => t.function.name))
	const additions: OpenAITool[] = []
	for (const t of openaiTools) {
		const actionSchema = (t.function.parameters as any)?.properties?.action
		const variants: any[] = actionSchema?.anyOf ?? actionSchema?.oneOf ?? []
		for (const variant of variants) {
			const props = variant?.properties
			if (!props) continue
			for (const name of Object.keys(props)) {
				if (seen.has(name)) continue
				seen.add(name)
				// Groq only checks the *name* against request.tools, so a minimal stub is
				// enough to pass validation while keeping prompt tokens (and latency) low.
				additions.push({
					type: 'function',
					function: { name, description: '', parameters: { type: 'object', properties: {} } },
				})
			}
		}
	}
	openaiTools.push(...additions)
}
