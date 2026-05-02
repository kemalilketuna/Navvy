import type { LLMConfig } from '@page-agent/llms'

import { type VoiceConfig, normalizeVoiceConfig } from '@/voice/types'

import { type ExtensionLanguage } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'
import { type MaskingEntry } from './masking'
import {
	type ProviderConfig,
	detectProvider,
	extractCloudflareAccountId,
	resolveBaseURL,
} from './providers'
import { type Skill } from './skills'

export type LanguagePreference = ExtensionLanguage | undefined

/** Agent response language. 'auto' = mirror the language of the user's task. */
export type ResponseLanguage = 'auto' | ExtensionLanguage

export interface AdvancedConfig {
	maxSteps?: number
	systemInstruction?: string
	experimentalLlmsTxt?: boolean
	experimentalIncludeAllTabs?: boolean
	disableNamedToolChoice?: boolean
}

export interface ExtConfig extends ProviderConfig, AdvancedConfig {
	language?: LanguagePreference
	responseLanguage: ResponseLanguage
	/** Locally-stored saved data / masking entries. @see masking.ts */
	maskingEntries: MaskingEntry[]
	/** Voice conversation settings (UI-only; not passed to core). @see voice/types.ts */
	voiceConfig: VoiceConfig
	/** Reusable Teach → Skills definitions. @see skills.ts */
	skills: Skill[]
}

function normalizeResponseLanguage(raw: unknown): ResponseLanguage {
	if (raw === 'auto') return 'auto'
	if (
		raw === 'en-US' ||
		raw === 'fr-FR' ||
		raw === 'de-DE' ||
		raw === 'es-ES' ||
		raw === 'it-IT' ||
		raw === 'pt-PT' ||
		raw === 'tr-TR'
	) {
		return raw
	}
	return 'auto'
}

/** Seed a provider config from a bare LLMConfig, inferring the provider preset. */
function providerConfigFromLlm(llm: LLMConfig): ProviderConfig {
	const providerKey = detectProvider(llm.baseURL)
	const accountId =
		providerKey === 'cloudflare' ? extractCloudflareAccountId(llm.baseURL) : undefined
	return {
		providerKey,
		baseURL: llm.baseURL,
		model: llm.model,
		apiKey: llm.apiKey,
		...(accountId !== undefined ? { accountId } : {}),
	}
}

function normalizeProviderConfig(raw: unknown): ProviderConfig {
	if (!raw || typeof raw !== 'object') return providerConfigFromLlm(DEMO_CONFIG)
	const stored = raw as ProviderConfig
	return { ...stored, baseURL: migrateLegacyEndpoint(stored).baseURL }
}

export async function loadConfig(): Promise<ExtConfig> {
	const result = await chrome.storage.local.get([
		'providerConfig',
		'language',
		'responseLanguage',
		'advancedConfig',
		'maskingEntries',
		'voiceConfig',
		'skills',
	])

	const providerConfig = normalizeProviderConfig(result.providerConfig)
	if (!result.providerConfig) {
		await chrome.storage.local.set({ providerConfig })
	}

	const language = (result.language as ExtensionLanguage) || undefined
	const responseLanguage = normalizeResponseLanguage(result.responseLanguage)
	const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {}
	const maskingEntries = (result.maskingEntries as MaskingEntry[]) ?? []
	const voiceConfig = normalizeVoiceConfig(result.voiceConfig)
	const skills = (result.skills as Skill[]) ?? []

	return {
		...providerConfig,
		...advancedConfig,
		language,
		responseLanguage,
		maskingEntries,
		voiceConfig,
		skills,
	}
}

export async function saveConfig(config: ExtConfig): Promise<ExtConfig> {
	const {
		providerKey,
		baseURL,
		model,
		apiKey,
		accountId,
		savedCredentials,
		language,
		responseLanguage,
		maxSteps,
		systemInstruction,
		experimentalLlmsTxt,
		experimentalIncludeAllTabs,
		disableNamedToolChoice,
		maskingEntries,
		voiceConfig,
		skills,
	} = config

	const providerConfig: ProviderConfig = {
		providerKey,
		baseURL,
		model,
		apiKey,
		...(accountId !== undefined ? { accountId } : {}),
		...(savedCredentials !== undefined ? { savedCredentials } : {}),
	}
	await chrome.storage.local.set({ providerConfig })

	if (language) {
		await chrome.storage.local.set({ language })
	} else {
		await chrome.storage.local.remove('language')
	}
	if (responseLanguage && responseLanguage !== 'auto') {
		await chrome.storage.local.set({ responseLanguage })
	} else {
		await chrome.storage.local.remove('responseLanguage')
	}

	const advancedConfig: AdvancedConfig = {
		maxSteps,
		systemInstruction,
		experimentalLlmsTxt,
		experimentalIncludeAllTabs,
		disableNamedToolChoice,
	}
	await chrome.storage.local.set({ advancedConfig })
	await chrome.storage.local.set({ maskingEntries: maskingEntries ?? [] })
	const normalizedVoice = normalizeVoiceConfig(voiceConfig)
	await chrome.storage.local.set({ voiceConfig: normalizedVoice })
	await chrome.storage.local.set({ skills: skills ?? [] })

	return {
		...providerConfig,
		...advancedConfig,
		language,
		responseLanguage,
		maskingEntries: maskingEntries ?? [],
		voiceConfig: normalizedVoice,
		skills: skills ?? [],
	}
}

/** Runtime LLM credentials for the active provider, with Cloudflare baseURL synthesis applied. */
export function toLlmConfig(config: ProviderConfig): LLMConfig {
	return {
		baseURL: resolveBaseURL(config),
		model: config.model,
		apiKey: config.apiKey,
	}
}
