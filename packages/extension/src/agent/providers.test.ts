import { describe, expect, it } from 'vitest'

import { PROVIDERS, PROVIDERS_BY_KEY, type ProviderKey, detectProvider } from './providers'

describe('providers registry', () => {
	it('exposes every major OpenAI-compatible provider plus custom', () => {
		const keys = PROVIDERS.map((p) => p.key)
		const required: ProviderKey[] = [
			'openai',
			'anthropic',
			'gemini',
			'groq',
			'deepseek',
			'mistral',
			'openrouter',
			'xai',
			'together',
			'fireworks',
			'cerebras',
			'perplexity',
			'nvidia',
			'cloudflare',
			'ollama',
			'custom',
		]
		for (const key of required) {
			expect(keys).toContain(key)
		}
	})

	it('has unique provider keys', () => {
		const keys = PROVIDERS.map((p) => p.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	it('non-custom presets resolve a non-empty https (or http localhost) baseURL and default model', () => {
		for (const p of PROVIDERS) {
			if (p.key === 'custom') continue
			// Some presets (e.g. Cloudflare) synthesize the runtime URL from credentials
			// via buildBaseURL instead of carrying a static baseURL.
			const resolved = p.buildBaseURL ? p.buildBaseURL({ accountId: 'acct' }) : p.baseURL
			expect(resolved, `${p.key} baseURL`).toMatch(/^https?:\/\//)
			expect(p.defaultModel, `${p.key} defaultModel`).not.toBe('')
		}
	})

	it('PROVIDERS_BY_KEY mirrors PROVIDERS exactly', () => {
		for (const p of PROVIDERS) {
			expect(PROVIDERS_BY_KEY[p.key]).toBe(p)
		}
	})

	it('cloudflare synthesizes its runtime URL from the account ID', () => {
		const cloudflare = PROVIDERS_BY_KEY.cloudflare
		expect(cloudflare.buildBaseURL).toBeTypeOf('function')
		expect(cloudflare.buildBaseURL?.({ accountId: 'acct-123' })).toContain('acct-123')
	})
})

describe('detectProvider', () => {
	it('matches well-known base URLs back to their provider', () => {
		expect(detectProvider('https://api.openai.com/v1')).toBe('openai')
		expect(detectProvider('https://api.openai.com/v1/')).toBe('openai')
		expect(detectProvider('https://api.groq.com/openai/v1')).toBe('groq')
		expect(detectProvider('https://api.deepseek.com/v1')).toBe('deepseek')
		expect(detectProvider('https://integrate.api.nvidia.com/v1')).toBe('nvidia')
	})

	it('falls back to custom for unknown URLs', () => {
		expect(detectProvider('https://example.com/my-proxy/v1')).toBe('custom')
		expect(detectProvider('')).toBe('custom')
	})

	it('is case-insensitive', () => {
		expect(detectProvider('HTTPS://API.OPENAI.COM/v1')).toBe('openai')
	})
})
