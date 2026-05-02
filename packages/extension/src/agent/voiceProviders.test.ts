import { describe, expect, it } from 'vitest'

import {
	STT_PROVIDERS,
	TTS_PROVIDERS,
	VOICE_PROVIDERS,
	VOICE_PROVIDERS_BY_KEY,
} from './voiceProviders'

describe('voice providers registry', () => {
	it('includes the four provider families plus the free Web Speech fallback', () => {
		const keys = VOICE_PROVIDERS.map((p) => p.key)
		expect(keys).toEqual(
			expect.arrayContaining(['webspeech', 'openai', 'groq', 'elevenlabs', 'deepgram'])
		)
	})

	it('indexes every provider by key', () => {
		for (const p of VOICE_PROVIDERS) {
			expect(VOICE_PROVIDERS_BY_KEY[p.key]).toBe(p)
		}
	})

	it('only lists STT providers that support STT, and likewise for TTS', () => {
		expect(STT_PROVIDERS.every((p) => p.supportsStt)).toBe(true)
		expect(TTS_PROVIDERS.every((p) => p.supportsTts)).toBe(true)
	})

	it('keeps default models within the declared model lists', () => {
		for (const p of VOICE_PROVIDERS) {
			if (p.defaultSttModel && p.sttModels.length > 0) {
				expect(p.sttModels.map((m) => m.id)).toContain(p.defaultSttModel)
			}
			if (p.defaultTtsModel && p.ttsModels.length > 0) {
				expect(p.ttsModels.map((m) => m.id)).toContain(p.defaultTtsModel)
			}
			if (p.defaultVoice && p.voices.length > 0) {
				expect(p.voices.map((v) => v.id)).toContain(p.defaultVoice)
			}
		}
	})

	it('requires an API key for every network provider', () => {
		for (const p of VOICE_PROVIDERS) {
			if (p.clientType !== 'webspeech') expect(p.requiresApiKey).toBe(true)
		}
		expect(VOICE_PROVIDERS_BY_KEY.webspeech.requiresApiKey).toBe(false)
	})
})
