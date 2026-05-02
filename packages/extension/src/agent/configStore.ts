import type { LLMConfig } from '@page-agent/llms'

import { type VoiceConfig, normalizeVoiceConfig } from '@/voice/types'

import { type ExtensionLanguage } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'
import { type MaskingEntry } from './masking'
import { type LLMProfile, buildProfilesState, resolveBaseURL } from './profiles'
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

export interface ExtConfig extends LLMConfig, AdvancedConfig {
	language?: LanguagePreference
	responseLanguage: ResponseLanguage
	profiles: LLMProfile[]
	activeProfileId: string
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

export async function loadConfig(): Promise<ExtConfig> {
	const result = await chrome.storage.local.get([
		'llmConfig',
		'language',
		'responseLanguage',
		'advancedConfig',
		'llmProfiles',
		'activeProfileId',
		'maskingEntries',
		'voiceConfig',
		'skills',
	])

	let legacyLlm = (result.llmConfig as LLMConfig) ?? DEMO_CONFIG
	const language = (result.language as ExtensionLanguage) || undefined
	const responseLanguage = normalizeResponseLanguage(result.responseLanguage)
	const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {}

	const migrated = migrateLegacyEndpoint(legacyLlm)
	if (migrated !== legacyLlm) {
		legacyLlm = migrated
		await chrome.storage.local.set({ llmConfig: migrated })
	} else if (!result.llmConfig) {
		await chrome.storage.local.set({ llmConfig: DEMO_CONFIG })
	}

	const { profiles, activeProfileId } = buildProfilesState(
		result.llmProfiles as LLMProfile[] | undefined,
		result.activeProfileId as string | undefined,
		legacyLlm
	)

	if (!result.llmProfiles || !result.activeProfileId) {
		await chrome.storage.local.set({ llmProfiles: profiles, activeProfileId })
	}

	const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
	const maskingEntries = (result.maskingEntries as MaskingEntry[]) ?? []
	const voiceConfig = normalizeVoiceConfig(result.voiceConfig)
	const skills = (result.skills as Skill[]) ?? []

	return {
		baseURL: resolveBaseURL(active),
		model: active.model,
		apiKey: active.apiKey,
		...advancedConfig,
		language,
		responseLanguage,
		profiles,
		activeProfileId: active.id,
		maskingEntries,
		voiceConfig,
		skills,
	}
}

export async function saveConfig(config: ExtConfig): Promise<ExtConfig> {
	const {
		language,
		responseLanguage,
		maxSteps,
		systemInstruction,
		experimentalLlmsTxt,
		experimentalIncludeAllTabs,
		disableNamedToolChoice,
		profiles,
		activeProfileId,
		maskingEntries,
		voiceConfig,
		skills,
	} = config

	const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
	const llmConfig: LLMConfig = {
		baseURL: resolveBaseURL(active),
		model: active.model,
		apiKey: active.apiKey,
	}

	await chrome.storage.local.set({
		llmConfig,
		llmProfiles: profiles,
		activeProfileId: active.id,
	})
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
		...llmConfig,
		...advancedConfig,
		language,
		responseLanguage,
		profiles,
		activeProfileId: active.id,
		maskingEntries: maskingEntries ?? [],
		voiceConfig: normalizedVoice,
		skills: skills ?? [],
	}
}
