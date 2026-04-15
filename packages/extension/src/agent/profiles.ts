/**
 * Pure helpers for managing LLM profiles. Kept free of React / chrome.* so
 * they are trivially unit-testable.
 */
import type { LLMConfig } from '@page-agent/llms'

import {
	PROVIDERS_BY_KEY,
	type ProviderKey,
	detectProvider,
	extractCloudflareAccountId,
} from './providers'

export interface ProviderCredentials {
	apiKey?: string
	accountId?: string
	baseURL?: string
	model?: string
}

export interface LLMProfile {
	id: string
	name: string
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

/** Compose the runtime baseURL for a profile, applying provider-specific synthesis. */
export function resolveBaseURL(profile: LLMProfile): string {
	const preset = PROVIDERS_BY_KEY[profile.providerKey]
	if (preset?.buildBaseURL) return preset.buildBaseURL({ accountId: profile.accountId })
	return profile.baseURL
}

/** Whether all required credentials for this profile are present. */
export function isProfileComplete(profile: LLMProfile): boolean {
	const preset = PROVIDERS_BY_KEY[profile.providerKey]
	if (!preset) return false
	if (preset.requiresApiKey && !profile.apiKey?.trim()) return false
	if (preset.requiresAccountId && !profile.accountId?.trim()) return false
	if (preset.baseURLEditable !== false && !preset.buildBaseURL) {
		if (!profile.baseURL?.trim()) return false
	}
	return true
}

export interface StoredProfilesState {
	profiles: LLMProfile[]
	activeProfileId: string
}

export function newProfileId(): string {
	return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeDefaultProfile(llm: LLMConfig): LLMProfile {
	const providerKey = detectProvider(llm.baseURL)
	const accountId =
		providerKey === 'cloudflare' ? extractCloudflareAccountId(llm.baseURL) : undefined
	return {
		id: newProfileId(),
		name: 'Default',
		providerKey,
		baseURL: llm.baseURL,
		model: llm.model,
		apiKey: llm.apiKey,
		...(accountId !== undefined ? { accountId } : {}),
	}
}

/** Migrate older stored profiles to the current shape (idempotent). */
export function migrateProfile(profile: LLMProfile): LLMProfile {
	if (profile.providerKey !== 'cloudflare') return profile
	if (profile.accountId !== undefined) return profile
	const accountId = extractCloudflareAccountId(profile.baseURL)
	return { ...profile, accountId }
}

/** Build the profile state, migrating from the legacy single `llmConfig` if needed. */
export function buildProfilesState(
	storedProfiles: LLMProfile[] | undefined,
	storedActiveId: string | undefined,
	legacyLlmConfig: LLMConfig
): StoredProfilesState {
	let profiles = Array.isArray(storedProfiles) ? storedProfiles.map(migrateProfile) : []
	if (profiles.length === 0) {
		profiles = [makeDefaultProfile(legacyLlmConfig)]
	}
	const activeId =
		storedActiveId && profiles.some((p) => p.id === storedActiveId)
			? storedActiveId
			: profiles[0].id
	return { profiles, activeProfileId: activeId }
}
