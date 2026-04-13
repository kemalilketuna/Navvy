/**
 * Pure helpers for managing LLM profiles. Kept free of React / chrome.* so
 * they are trivially unit-testable.
 */
import type { LLMConfig } from '@page-agent/llms'

import { type ProviderKey, detectProvider } from './providers'

export interface LLMProfile {
	id: string
	name: string
	providerKey: ProviderKey
	baseURL: string
	model: string
	apiKey?: string
}

export interface StoredProfilesState {
	profiles: LLMProfile[]
	activeProfileId: string
}

export function newProfileId(): string {
	return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeDefaultProfile(llm: LLMConfig): LLMProfile {
	return {
		id: newProfileId(),
		name: 'Default',
		providerKey: detectProvider(llm.baseURL),
		baseURL: llm.baseURL,
		model: llm.model,
		apiKey: llm.apiKey,
	}
}

/** Build the profile state, migrating from the legacy single `llmConfig` if needed. */
export function buildProfilesState(
	storedProfiles: LLMProfile[] | undefined,
	storedActiveId: string | undefined,
	legacyLlmConfig: LLMConfig
): StoredProfilesState {
	let profiles = Array.isArray(storedProfiles) ? storedProfiles : []
	if (profiles.length === 0) {
		profiles = [makeDefaultProfile(legacyLlmConfig)]
	}
	const activeId =
		storedActiveId && profiles.some((p) => p.id === storedActiveId)
			? storedActiveId
			: profiles[0].id
	return { profiles, activeProfileId: activeId }
}
