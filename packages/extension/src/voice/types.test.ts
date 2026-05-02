import { describe, expect, it } from 'vitest'

import { DEFAULT_VOICE_CONFIG, normalizeVoiceConfig } from './types'

describe('normalizeVoiceConfig', () => {
	it('returns a full default config for missing/invalid input', () => {
		expect(normalizeVoiceConfig(undefined)).toEqual(DEFAULT_VOICE_CONFIG)
		expect(normalizeVoiceConfig(null)).toEqual(DEFAULT_VOICE_CONFIG)
		expect(normalizeVoiceConfig('nope')).toEqual(DEFAULT_VOICE_CONFIG)
	})

	it('fills missing fields from defaults while keeping provided ones', () => {
		const result = normalizeVoiceConfig({ enabled: true, ttsProviderKey: 'elevenlabs' })
		expect(result.enabled).toBe(true)
		expect(result.ttsProviderKey).toBe('elevenlabs')
		expect(result.sttProviderKey).toBe(DEFAULT_VOICE_CONFIG.sttProviderKey)
		expect(result.holdKey).toBe(DEFAULT_VOICE_CONFIG.holdKey)
	})

	it('clones apiKeys so callers cannot mutate the source object', () => {
		const source = { apiKeys: { elevenlabs: 'k' } }
		const result = normalizeVoiceConfig(source)
		result.apiKeys.deepgram = 'x'
		expect(source.apiKeys).not.toHaveProperty('deepgram')
		expect(result.apiKeys.elevenlabs).toBe('k')
	})
})
