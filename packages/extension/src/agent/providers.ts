import { DEMO_BASE_URL, DEMO_MODEL } from './constants'

/**
 * Registry of OpenAI-compatible LLM providers. Each entry supplies a base URL
 * preset and a sensible default model so users can switch providers without
 * looking up the docs. Selecting `custom` lets the user enter an arbitrary URL.
 */

export type ProviderKey =
	| 'navvyDemo'
	| 'openai'
	| 'anthropic'
	| 'gemini'
	| 'groq'
	| 'deepseek'
	| 'mistral'
	| 'openrouter'
	| 'xai'
	| 'together'
	| 'fireworks'
	| 'cerebras'
	| 'perplexity'
	| 'nvidia'
	| 'cloudflare'
	| 'ollama'
	| 'custom'

export interface ProviderPreset {
	key: ProviderKey
	label: string
	baseURL: string
	defaultModel: string
	docsURL?: string
	apiKeyURL?: string
	/**
	 * Provider only accepts the canonical page-agent system prompt and rejects
	 * any other request shape. Disables ancillary LLM calls (e.g. tab-group
	 * title summarization) that would otherwise be guaranteed to fail.
	 */
	restrictsSystemPrompt?: boolean
}

export const PROVIDERS: ProviderPreset[] = [
	{
		key: 'navvyDemo',
		label: 'Navvy Demo (testing)',
		baseURL: DEMO_BASE_URL,
		defaultModel: DEMO_MODEL,
		restrictsSystemPrompt: true,
	},
	{
		key: 'openai',
		label: 'OpenAI',
		baseURL: 'https://api.openai.com/v1',
		defaultModel: 'gpt-4o-mini',
		docsURL: 'https://platform.openai.com/docs/api-reference',
		apiKeyURL: 'https://platform.openai.com/api-keys',
	},
	{
		key: 'anthropic',
		label: 'Anthropic (Claude)',
		baseURL: 'https://api.anthropic.com/v1',
		defaultModel: 'claude-sonnet-4-5',
		docsURL: 'https://docs.anthropic.com/en/api/openai-sdk',
		apiKeyURL: 'https://console.anthropic.com/settings/keys',
	},
	{
		key: 'gemini',
		label: 'Google Gemini',
		baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
		defaultModel: 'gemini-2.5-flash',
		docsURL: 'https://ai.google.dev/gemini-api/docs/openai',
		apiKeyURL: 'https://aistudio.google.com/app/apikey',
	},
	{
		key: 'groq',
		label: 'Groq',
		baseURL: 'https://api.groq.com/openai/v1',
		defaultModel: 'llama-3.3-70b-versatile',
		docsURL: 'https://console.groq.com/docs/openai',
		apiKeyURL: 'https://console.groq.com/keys',
	},
	{
		key: 'deepseek',
		label: 'DeepSeek',
		baseURL: 'https://api.deepseek.com/v1',
		defaultModel: 'deepseek-chat',
		docsURL: 'https://api-docs.deepseek.com/',
		apiKeyURL: 'https://platform.deepseek.com/api_keys',
	},
	{
		key: 'mistral',
		label: 'Mistral',
		baseURL: 'https://api.mistral.ai/v1',
		defaultModel: 'mistral-large-latest',
		docsURL: 'https://docs.mistral.ai/api/',
		apiKeyURL: 'https://console.mistral.ai/api-keys/',
	},
	{
		key: 'openrouter',
		label: 'OpenRouter',
		baseURL: 'https://openrouter.ai/api/v1',
		defaultModel: 'openai/gpt-4o-mini',
		docsURL: 'https://openrouter.ai/docs',
		apiKeyURL: 'https://openrouter.ai/keys',
	},
	{
		key: 'xai',
		label: 'xAI (Grok)',
		baseURL: 'https://api.x.ai/v1',
		defaultModel: 'grok-4',
		docsURL: 'https://docs.x.ai/docs/overview',
		apiKeyURL: 'https://console.x.ai/',
	},
	{
		key: 'together',
		label: 'Together AI',
		baseURL: 'https://api.together.xyz/v1',
		defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
		docsURL: 'https://docs.together.ai/docs/openai-api-compatibility',
		apiKeyURL: 'https://api.together.xyz/settings/api-keys',
	},
	{
		key: 'fireworks',
		label: 'Fireworks AI',
		baseURL: 'https://api.fireworks.ai/inference/v1',
		defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
		docsURL: 'https://docs.fireworks.ai/api-reference/introduction',
		apiKeyURL: 'https://fireworks.ai/account/api-keys',
	},
	{
		key: 'cerebras',
		label: 'Cerebras',
		baseURL: 'https://api.cerebras.ai/v1',
		defaultModel: 'llama-3.3-70b',
		docsURL: 'https://inference-docs.cerebras.ai/introduction',
		apiKeyURL: 'https://cloud.cerebras.ai/',
	},
	{
		key: 'perplexity',
		label: 'Perplexity',
		baseURL: 'https://api.perplexity.ai',
		defaultModel: 'sonar',
		docsURL: 'https://docs.perplexity.ai/api-reference/chat-completions',
		apiKeyURL: 'https://www.perplexity.ai/settings/api',
	},
	{
		key: 'nvidia',
		label: 'NVIDIA NIM',
		baseURL: 'https://integrate.api.nvidia.com/v1',
		defaultModel: 'meta/llama-3.3-70b-instruct',
		docsURL: 'https://docs.api.nvidia.com/nim/reference/llm-apis',
		apiKeyURL: 'https://build.nvidia.com/',
	},
	{
		key: 'cloudflare',
		label: 'Cloudflare Workers AI (replace {ACCOUNT_ID})',
		baseURL: 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1',
		defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		docsURL: 'https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/',
		apiKeyURL: 'https://dash.cloudflare.com/profile/api-tokens',
	},
	{
		key: 'ollama',
		label: 'Ollama (local)',
		baseURL: 'http://localhost:11434/v1',
		defaultModel: 'llama3.1',
		docsURL: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
	},
	{
		key: 'custom',
		label: 'Custom',
		baseURL: '',
		defaultModel: '',
	},
]

export const PROVIDERS_BY_KEY: Record<ProviderKey, ProviderPreset> = PROVIDERS.reduce(
	(acc, p) => {
		acc[p.key] = p
		return acc
	},
	{} as Record<ProviderKey, ProviderPreset>
)

/** Best-effort detection of provider from a baseURL (used on migration). */
export function detectProvider(baseURL: string): ProviderKey {
	const normalized = baseURL.replace(/\/+$/, '').toLowerCase()
	for (const p of PROVIDERS) {
		if (p.key === 'custom') continue
		if (normalized === p.baseURL.replace(/\/+$/, '').toLowerCase()) return p.key
	}
	return 'custom'
}
