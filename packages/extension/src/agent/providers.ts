import { DEMO_BASE_URL, DEMO_MODEL } from './constants'

/**
 * Registry of OpenAI-compatible LLM providers. Each entry supplies a base URL
 * preset, a curated list of currently available chat models, and a declarative
 * schema for which credential fields the form should render. Selecting `custom`
 * lets the user enter an arbitrary URL/model.
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

export interface ModelInfo {
	id: string
	label?: string
	supportsImages: boolean
}

export interface ProviderPreset {
	key: ProviderKey
	label: string
	baseURL: string
	defaultModel: string
	models: ModelInfo[]
	requiresApiKey: boolean
	requiresAccountId?: boolean
	/** When false, the Base URL field is hidden — runtime URL comes from preset / buildBaseURL. */
	baseURLEditable?: boolean
	/** Synthesize the final baseURL at save/runtime (e.g. Cloudflare account-scoped URL). */
	buildBaseURL?: (params: { accountId?: string }) => string
	docsURL?: string
	apiKeyURL?: string
	accountIdHelpURL?: string
	/**
	 * Provider only accepts the canonical page-agent system prompt and rejects
	 * any other request shape. Disables ancillary LLM calls (e.g. tab-group
	 * title summarization) that would otherwise be guaranteed to fail.
	 */
	restrictsSystemPrompt?: boolean
}

const M = (id: string, supportsImages = false, label?: string): ModelInfo => ({
	id,
	supportsImages,
	...(label ? { label } : {}),
})

export const PROVIDERS: ProviderPreset[] = [
	{
		key: 'navvyDemo',
		label: 'Navvy Demo (testing)',
		baseURL: DEMO_BASE_URL,
		defaultModel: DEMO_MODEL,
		models: [M(DEMO_MODEL, false)],
		requiresApiKey: false,
		baseURLEditable: false,
		restrictsSystemPrompt: true,
	},
	{
		key: 'openai',
		label: 'OpenAI',
		baseURL: 'https://api.openai.com/v1',
		defaultModel: 'gpt-5.4-mini',
		models: [
			M('gpt-5.5', true),
			M('gpt-5.5-pro', true),
			M('gpt-5.4', true),
			M('gpt-5.4-mini', true),
			M('gpt-5.4-nano', true),
			M('gpt-5.3-codex', true),
			M('gpt-4o', true),
			M('gpt-4o-mini', true),
			M('o4-mini', true),
			M('o3', true),
		],
		requiresApiKey: true,
		docsURL: 'https://platform.openai.com/docs/api-reference',
		apiKeyURL: 'https://platform.openai.com/api-keys',
	},
	{
		key: 'anthropic',
		label: 'Anthropic (Claude)',
		baseURL: 'https://api.anthropic.com/v1',
		defaultModel: 'claude-sonnet-4-6',
		models: [
			M('claude-opus-4-7', true),
			M('claude-sonnet-4-6', true),
			M('claude-haiku-4-5', true),
			M('claude-opus-4-6', true),
			M('claude-sonnet-4-5', true),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.anthropic.com/en/api/openai-sdk',
		apiKeyURL: 'https://console.anthropic.com/settings/keys',
	},
	{
		key: 'gemini',
		label: 'Google Gemini',
		baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
		defaultModel: 'gemini-2.5-flash',
		models: [
			M('gemini-3.1-pro', true),
			M('gemini-3.1-flash', true),
			M('gemini-3.1-flash-lite', true),
			M('gemini-2.5-pro', true),
			M('gemini-2.5-flash', true),
			M('gemini-2.5-flash-lite', true),
		],
		requiresApiKey: true,
		docsURL: 'https://ai.google.dev/gemini-api/docs/openai',
		apiKeyURL: 'https://aistudio.google.com/app/apikey',
	},
	{
		key: 'groq',
		label: 'Groq',
		baseURL: 'https://api.groq.com/openai/v1',
		defaultModel: 'llama-3.3-70b-versatile',
		models: [
			M('meta-llama/llama-4-maverick-17b-128e-instruct', true),
			M('meta-llama/llama-4-scout-17b-16e-instruct', true),
			M('llama-3.3-70b-versatile', false),
			M('llama-3.2-90b-vision-preview', true),
			M('llama-3.2-11b-vision-preview', true),
			M('deepseek-r1-distill-llama-70b', false),
			M('qwen/qwen3-32b', false),
		],
		requiresApiKey: true,
		docsURL: 'https://console.groq.com/docs/openai',
		apiKeyURL: 'https://console.groq.com/keys',
	},
	{
		key: 'deepseek',
		label: 'DeepSeek',
		baseURL: 'https://api.deepseek.com/v1',
		defaultModel: 'deepseek-chat',
		models: [
			M('deepseek-chat', false),
			M('deepseek-reasoner', false),
			M('deepseek-v4-flash', false),
			M('deepseek-v4-pro', false),
		],
		requiresApiKey: true,
		docsURL: 'https://api-docs.deepseek.com/',
		apiKeyURL: 'https://platform.deepseek.com/api_keys',
	},
	{
		key: 'mistral',
		label: 'Mistral',
		baseURL: 'https://api.mistral.ai/v1',
		defaultModel: 'mistral-large-latest',
		models: [
			M('mistral-large-latest', false),
			M('mistral-large-3-latest', false),
			M('mistral-small-latest', true),
			M('mistral-small-4-latest', true),
			M('pixtral-large-latest', true),
			M('pixtral-12b-2409', true),
			M('ministral-8b-latest', false),
			M('ministral-3b-latest', false),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.mistral.ai/api/',
		apiKeyURL: 'https://console.mistral.ai/api-keys/',
	},
	{
		key: 'openrouter',
		label: 'OpenRouter',
		baseURL: 'https://openrouter.ai/api/v1',
		defaultModel: 'openai/gpt-4o-mini',
		models: [
			M('openai/gpt-5.5', true),
			M('openai/gpt-5.4-mini', true),
			M('openai/gpt-4o', true),
			M('openai/gpt-4o-mini', true),
			M('anthropic/claude-opus-4-7', true),
			M('anthropic/claude-sonnet-4-6', true),
			M('anthropic/claude-haiku-4-5', true),
			M('google/gemini-3.1-pro', true),
			M('google/gemini-3.1-flash', true),
			M('meta-llama/llama-4-maverick', true),
			M('meta-llama/llama-4-scout', true),
			M('deepseek/deepseek-chat', false),
			M('deepseek/deepseek-reasoner', false),
			M('mistralai/mistral-large', false),
			M('x-ai/grok-4', false),
		],
		requiresApiKey: true,
		docsURL: 'https://openrouter.ai/docs',
		apiKeyURL: 'https://openrouter.ai/keys',
	},
	{
		key: 'xai',
		label: 'xAI (Grok)',
		baseURL: 'https://api.x.ai/v1',
		defaultModel: 'grok-4',
		models: [
			M('grok-4.3', false),
			M('grok-4', false),
			M('grok-3', false),
			M('grok-3-mini', false),
			M('grok-2-vision-1212', true),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.x.ai/docs/overview',
		apiKeyURL: 'https://console.x.ai/',
	},
	{
		key: 'together',
		label: 'Together AI',
		baseURL: 'https://api.together.xyz/v1',
		defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
		models: [
			M('meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', true),
			M('meta-llama/Llama-4-Scout-17B-16E-Instruct', true),
			M('meta-llama/Llama-3.3-70B-Instruct-Turbo', false),
			M('meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo', true),
			M('meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', true),
			M('Qwen/Qwen3-235B-A22B-Instruct-2507-tput', false),
			M('Qwen/Qwen3-VL-235B-A22B-Instruct', true),
			M('deepseek-ai/DeepSeek-V3', false),
			M('deepseek-ai/DeepSeek-R1', false),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.together.ai/docs/openai-api-compatibility',
		apiKeyURL: 'https://api.together.xyz/settings/api-keys',
	},
	{
		key: 'fireworks',
		label: 'Fireworks AI',
		baseURL: 'https://api.fireworks.ai/inference/v1',
		defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
		models: [
			M('accounts/fireworks/models/llama4-maverick-instruct-basic', true),
			M('accounts/fireworks/models/llama4-scout-instruct-basic', true),
			M('accounts/fireworks/models/llama-v3p3-70b-instruct', false),
			M('accounts/fireworks/models/deepseek-v3', false),
			M('accounts/fireworks/models/deepseek-r1', false),
			M('accounts/fireworks/models/qwen3-235b-a22b-instruct-2507', false),
			M('accounts/fireworks/models/qwen3-vl-235b-a22b-instruct', true),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.fireworks.ai/api-reference/introduction',
		apiKeyURL: 'https://fireworks.ai/account/api-keys',
	},
	{
		key: 'cerebras',
		label: 'Cerebras',
		baseURL: 'https://api.cerebras.ai/v1',
		defaultModel: 'llama-3.3-70b',
		models: [
			M('llama-3.3-70b', false),
			M('llama-4-scout-17b-16e-instruct', true),
			M('llama-4-maverick-17b-128e-instruct', true),
			M('qwen-3-235b-a22b-instruct-2507', false),
			M('qwen-3-235b-a22b-thinking-2507', false),
			M('gpt-oss-120b', false),
			M('zai-glm-4.7', false),
		],
		requiresApiKey: true,
		docsURL: 'https://inference-docs.cerebras.ai/introduction',
		apiKeyURL: 'https://cloud.cerebras.ai/',
	},
	{
		key: 'perplexity',
		label: 'Perplexity',
		baseURL: 'https://api.perplexity.ai',
		defaultModel: 'sonar',
		models: [
			M('sonar', false),
			M('sonar-pro', false),
			M('sonar-reasoning', false),
			M('sonar-reasoning-pro', false),
			M('sonar-deep-research', false),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.perplexity.ai/api-reference/chat-completions',
		apiKeyURL: 'https://www.perplexity.ai/settings/api',
	},
	{
		key: 'nvidia',
		label: 'NVIDIA NIM',
		baseURL: 'https://integrate.api.nvidia.com/v1',
		defaultModel: 'meta/llama-3.3-70b-instruct',
		models: [
			M('meta/llama-4-maverick-17b-128e-instruct', true),
			M('meta/llama-4-scout-17b-16e-instruct', true),
			M('meta/llama-3.3-70b-instruct', false),
			M('mistralai/mistral-small-3.1-24b-instruct', true),
			M('deepseek-ai/deepseek-v3.1', false),
			M('deepseek-ai/deepseek-r1', false),
			M('qwen/qwen3-235b-a22b', false),
		],
		requiresApiKey: true,
		docsURL: 'https://docs.api.nvidia.com/nim/reference/llm-apis',
		apiKeyURL: 'https://build.nvidia.com/',
	},
	{
		key: 'cloudflare',
		label: 'Cloudflare Workers AI',
		baseURL: '',
		defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		models: [
			M('@cf/meta/llama-4-scout-17b-16e-instruct', true),
			M('@cf/meta/llama-3.3-70b-instruct-fp8-fast', false),
			M('@cf/meta/llama-3.2-11b-vision-instruct', true),
			M('@cf/meta/llama-3.1-8b-instruct-fast', false),
			M('@cf/qwen/qwen3-235b-a22b-instruct', false),
			M('@cf/qwen/qwen2.5-coder-32b-instruct', false),
			M('@cf/qwen/qwq-32b', false),
			M('@cf/mistralai/mistral-small-3.1-24b-instruct', true),
			M('@cf/google/gemma-3-12b-it', true),
			M('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', false),
		],
		requiresApiKey: true,
		requiresAccountId: true,
		baseURLEditable: false,
		buildBaseURL: ({ accountId }) =>
			`https://api.cloudflare.com/client/v4/accounts/${accountId ?? ''}/ai/v1`,
		docsURL: 'https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/',
		apiKeyURL: 'https://dash.cloudflare.com/profile/api-tokens',
		accountIdHelpURL:
			'https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/',
	},
	{
		key: 'ollama',
		label: 'Ollama (local)',
		baseURL: 'http://localhost:11434/v1',
		defaultModel: 'llama3.3',
		models: [
			M('llama3.3', false),
			M('llama3.2', false),
			M('llama3.2-vision', true),
			M('llama3.1', false),
			M('qwen3', false),
			M('deepseek-r1', false),
			M('mistral', false),
			M('gemma3', true),
		],
		requiresApiKey: false,
		docsURL: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
	},
	{
		key: 'custom',
		label: 'Custom',
		baseURL: '',
		defaultModel: '',
		models: [],
		requiresApiKey: true,
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
	if (/api\.cloudflare\.com\/client\/v4\/accounts\/.+\/ai\/v1/i.test(baseURL)) {
		return 'cloudflare'
	}
	for (const p of PROVIDERS) {
		if (p.key === 'custom' || !p.baseURL) continue
		if (normalized === p.baseURL.replace(/\/+$/, '').toLowerCase()) return p.key
	}
	return 'custom'
}

/** Extract a Cloudflare account ID from a legacy/templated baseURL. Empty string if none. */
export function extractCloudflareAccountId(baseURL: string): string {
	const re = /cloudflare\.com\/client\/v4\/accounts\/([^/]+)\/ai\/v1/i
	const match = re.exec(baseURL)
	const raw = match?.[1] ?? ''
	if (!raw || raw === '{ACCOUNT_ID}') return ''
	return raw
}

interface ProviderModelRef {
	providerKey: ProviderKey
	model: string
}

export function getModelInfo(ref: ProviderModelRef): ModelInfo | undefined {
	const preset = PROVIDERS_BY_KEY[ref.providerKey]
	if (!preset) return undefined
	return preset.models.find((m) => m.id === ref.model)
}

/**
 * Whether the selected model is known to accept image input. Returns false for
 * unknown / free-typed model strings — image features should fail closed rather
 * than appear and then 400 at request time.
 */
export function modelSupportsImages(ref: ProviderModelRef): boolean {
	return getModelInfo(ref)?.supportsImages ?? false
}

export interface ProviderCredentials {
	apiKey?: string
	accountId?: string
	baseURL?: string
	model?: string
}

/** The provider half of the extension config — everything the Providers form edits. */
export interface ProviderConfig {
	providerKey: ProviderKey
	baseURL: string
	model: string
	apiKey?: string
	/** Cloudflare-only: account ID used to template the runtime baseURL. */
	accountId?: string
	/**
	 * Per-provider credential memory. Lets a user enter their OpenAI key, switch
	 * to Anthropic, then return to OpenAI without re-typing — keys are kept
	 * around even when not currently selected.
	 */
	savedCredentials?: Partial<Record<ProviderKey, ProviderCredentials>>
}

/** Compose the runtime baseURL, applying provider-specific synthesis (e.g. Cloudflare). */
export function resolveBaseURL(config: {
	providerKey: ProviderKey
	baseURL: string
	accountId?: string
}): string {
	const preset = PROVIDERS_BY_KEY[config.providerKey]
	if (preset?.buildBaseURL) return preset.buildBaseURL({ accountId: config.accountId })
	return config.baseURL
}

/** Whether all required credentials for the selected provider are present. */
export function isProviderConfigComplete(config: {
	providerKey: ProviderKey
	baseURL: string
	apiKey?: string
	accountId?: string
}): boolean {
	const preset = PROVIDERS_BY_KEY[config.providerKey]
	if (!preset) return false
	if (preset.requiresApiKey && !config.apiKey?.trim()) return false
	if (preset.requiresAccountId && !config.accountId?.trim()) return false
	if (preset.baseURLEditable !== false && !preset.buildBaseURL) {
		if (!config.baseURL?.trim()) return false
	}
	return true
}
