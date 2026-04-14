import type { LLMConfig } from '@page-agent/llms'

import { type ExtensionLanguage } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'
import { type LLMProfile, buildProfilesState } from './profiles'

export type LanguagePreference = ExtensionLanguage | undefined

export interface AdvancedConfig {
	maxSteps?: number
	systemInstruction?: string
	experimentalLlmsTxt?: boolean
	experimentalIncludeAllTabs?: boolean
	disableNamedToolChoice?: boolean
}

export interface ExtConfig extends LLMConfig, AdvancedConfig {
	language?: LanguagePreference
	profiles: LLMProfile[]
	activeProfileId: string
}

export async function loadConfig(): Promise<ExtConfig> {
	const result = await chrome.storage.local.get([
		'llmConfig',
		'language',
		'advancedConfig',
		'llmProfiles',
		'activeProfileId',
	])

	let legacyLlm = (result.llmConfig as LLMConfig) ?? DEMO_CONFIG
	const language = (result.language as ExtensionLanguage) || undefined
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

	return {
		baseURL: active.baseURL,
		model: active.model,
		apiKey: active.apiKey,
		...advancedConfig,
		language,
		profiles,
		activeProfileId: active.id,
	}
}

export async function saveConfig(config: ExtConfig): Promise<ExtConfig> {
	const {
		language,
		maxSteps,
		systemInstruction,
		experimentalLlmsTxt,
		experimentalIncludeAllTabs,
		disableNamedToolChoice,
		profiles,
		activeProfileId,
	} = config

	const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
	const llmConfig: LLMConfig = {
		baseURL: active.baseURL,
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
	const advancedConfig: AdvancedConfig = {
		maxSteps,
		systemInstruction,
		experimentalLlmsTxt,
		experimentalIncludeAllTabs,
		disableNamedToolChoice,
	}
	await chrome.storage.local.set({ advancedConfig })

	return {
		...llmConfig,
		...advancedConfig,
		language,
		profiles,
		activeProfileId: active.id,
	}
}
