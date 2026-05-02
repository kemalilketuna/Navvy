import { describe, expect, it } from 'vitest'

import { buildProfilesState } from './profiles'
import type { LLMProfile } from './profiles'

const legacy = { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-x' }

describe('buildProfilesState', () => {
	it('migrates a missing profile list into a single Default profile seeded from legacy llmConfig', () => {
		const { profiles, activeProfileId } = buildProfilesState(undefined, undefined, legacy)
		expect(profiles).toHaveLength(1)
		expect(profiles[0]).toMatchObject({
			name: 'Default',
			providerKey: 'openai',
			baseURL: legacy.baseURL,
			model: legacy.model,
			apiKey: legacy.apiKey,
		})
		expect(activeProfileId).toBe(profiles[0].id)
	})

	it('detects custom provider when legacy baseURL is unknown', () => {
		const custom = { baseURL: 'https://my-proxy.example/v1', model: 'foo' }
		const { profiles } = buildProfilesState(undefined, undefined, custom)
		expect(profiles[0].providerKey).toBe('custom')
	})

	it('preserves stored profiles and respects activeProfileId', () => {
		const stored: LLMProfile[] = [
			{ id: 'a', name: 'A', providerKey: 'openai', baseURL: 'x', model: 'm' },
			{ id: 'b', name: 'B', providerKey: 'groq', baseURL: 'y', model: 'm' },
		]
		const { profiles, activeProfileId } = buildProfilesState(stored, 'b', legacy)
		expect(profiles).toStrictEqual(stored)
		expect(activeProfileId).toBe('b')
	})

	it('falls back to the first profile when activeProfileId is stale', () => {
		const stored: LLMProfile[] = [
			{ id: 'a', name: 'A', providerKey: 'openai', baseURL: 'x', model: 'm' },
		]
		const { activeProfileId } = buildProfilesState(stored, 'missing', legacy)
		expect(activeProfileId).toBe('a')
	})

	it('treats an empty stored array as needing migration', () => {
		const { profiles } = buildProfilesState([], undefined, legacy)
		expect(profiles).toHaveLength(1)
		expect(profiles[0].name).toBe('Default')
	})
})
