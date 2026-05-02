import type { LLMConfig } from '@page-agent/llms'

import { decryptString, encryptString, isEncrypted } from '@/lib/crypto'
import { type ShortcutsConfig, normalizeShortcutsConfig } from '@/lib/shortcuts'
import { type VoiceConfig, normalizeVoiceConfig } from '@/voice/types'

import { type ExtensionLanguage } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'
import { type MaskingEntry } from './masking'
import {
	type ProviderConfig,
	type ProviderKey,
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
	/** User-configurable keyboard shortcuts. @see lib/shortcuts.ts */
	shortcutsConfig: ShortcutsConfig
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

// --- At-rest encryption of secrets (see lib/crypto.ts) -----------------------
// Only secret fields are wrapped; provider/model/baseURL stay readable so stored
// config remains debuggable. Runtime config is always plaintext: encryption
// lives entirely at the chrome.storage.local boundary.

/** Decrypt a stored secret, degrading to undefined (not crashing) if the key is gone. */
async function safeDecrypt(value: string | undefined): Promise<string | undefined> {
	if (value == null) return value
	try {
		return await decryptString(value)
	} catch (e) {
		console.warn('[configStore] could not decrypt a stored secret; treating it as unset', e)
		return undefined
	}
}

async function encryptProviderConfig(c: ProviderConfig): Promise<ProviderConfig> {
	const out: ProviderConfig = { ...c }
	if (c.apiKey) out.apiKey = await encryptString(c.apiKey)
	if (c.savedCredentials) {
		const sc: NonNullable<ProviderConfig['savedCredentials']> = {}
		for (const [k, v] of Object.entries(c.savedCredentials)) {
			sc[k as ProviderKey] = v?.apiKey ? { ...v, apiKey: await encryptString(v.apiKey) } : v
		}
		out.savedCredentials = sc
	}
	return out
}

async function decryptProviderConfig(c: ProviderConfig): Promise<ProviderConfig> {
	const out: ProviderConfig = { ...c, apiKey: await safeDecrypt(c.apiKey) }
	if (c.savedCredentials) {
		const sc: NonNullable<ProviderConfig['savedCredentials']> = {}
		for (const [k, v] of Object.entries(c.savedCredentials)) {
			sc[k as ProviderKey] = v?.apiKey ? { ...v, apiKey: await safeDecrypt(v.apiKey) } : v
		}
		out.savedCredentials = sc
	}
	return out
}

async function encryptVoiceConfig(v: VoiceConfig): Promise<VoiceConfig> {
	const apiKeys: VoiceConfig['apiKeys'] = {}
	for (const [k, val] of Object.entries(v.apiKeys)) {
		if (val) apiKeys[k as keyof VoiceConfig['apiKeys']] = await encryptString(val)
	}
	return { ...v, apiKeys }
}

async function decryptVoiceConfig(v: VoiceConfig): Promise<VoiceConfig> {
	const apiKeys: VoiceConfig['apiKeys'] = {}
	for (const [k, val] of Object.entries(v.apiKeys)) {
		const dec = await safeDecrypt(val)
		if (dec) apiKeys[k as keyof VoiceConfig['apiKeys']] = dec
	}
	return { ...v, apiKeys }
}

function encryptMaskingEntries(entries: MaskingEntry[]): Promise<MaskingEntry[]> {
	return Promise.all(
		entries.map(async (e) => ({ ...e, value: e.value ? await encryptString(e.value) : e.value }))
	)
}

function decryptMaskingEntries(entries: MaskingEntry[]): Promise<MaskingEntry[]> {
	return Promise.all(
		entries.map(async (e) => ({ ...e, value: (await safeDecrypt(e.value)) ?? '' }))
	)
}

/** True if any stored secret is still legacy plaintext and should be re-saved encrypted. */
function hasPlaintextSecret(rawProvider: unknown, rawVoice: unknown, rawMasking: unknown): boolean {
	const plain = (s: unknown): boolean => typeof s === 'string' && s.length > 0 && !isEncrypted(s)
	const p = rawProvider as ProviderConfig | undefined
	if (p) {
		if (plain(p.apiKey)) return true
		for (const v of Object.values(p.savedCredentials ?? {})) if (plain(v?.apiKey)) return true
	}
	const vc = rawVoice as VoiceConfig | undefined
	for (const v of Object.values(vc?.apiKeys ?? {})) if (plain(v)) return true
	for (const e of (rawMasking as MaskingEntry[] | undefined) ?? []) if (plain(e.value)) return true
	return false
}

export async function loadConfig(): Promise<ExtConfig> {
	const result = await chrome.storage.local.get([
		'providerConfig',
		'language',
		'responseLanguage',
		'advancedConfig',
		'maskingEntries',
		'voiceConfig',
		'shortcutsConfig',
		'skills',
	])

	const providerConfig = await decryptProviderConfig(normalizeProviderConfig(result.providerConfig))
	if (!result.providerConfig) {
		await chrome.storage.local.set({ providerConfig: await encryptProviderConfig(providerConfig) })
	}

	const language = (result.language as ExtensionLanguage) || undefined
	const responseLanguage = normalizeResponseLanguage(result.responseLanguage)
	const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {}
	const maskingEntries = await decryptMaskingEntries(
		(result.maskingEntries as MaskingEntry[]) ?? []
	)
	const voiceConfig = await decryptVoiceConfig(normalizeVoiceConfig(result.voiceConfig))
	const shortcutsConfig = normalizeShortcutsConfig(result.shortcutsConfig)
	const skills = (result.skills as Skill[]) ?? []

	// One-time migration: re-store any legacy plaintext secrets as ciphertext.
	if (hasPlaintextSecret(result.providerConfig, result.voiceConfig, result.maskingEntries)) {
		await chrome.storage.local.set({
			providerConfig: await encryptProviderConfig(providerConfig),
			voiceConfig: await encryptVoiceConfig(voiceConfig),
			maskingEntries: await encryptMaskingEntries(maskingEntries),
		})
	}

	return {
		...providerConfig,
		...advancedConfig,
		language,
		responseLanguage,
		maskingEntries,
		voiceConfig,
		shortcutsConfig,
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
		shortcutsConfig,
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
	await chrome.storage.local.set({ providerConfig: await encryptProviderConfig(providerConfig) })

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
	await chrome.storage.local.set({
		maskingEntries: await encryptMaskingEntries(maskingEntries ?? []),
	})
	const normalizedVoice = normalizeVoiceConfig(voiceConfig)
	await chrome.storage.local.set({ voiceConfig: await encryptVoiceConfig(normalizedVoice) })
	const normalizedShortcuts = normalizeShortcutsConfig(shortcutsConfig)
	await chrome.storage.local.set({ shortcutsConfig: normalizedShortcuts })
	await chrome.storage.local.set({ skills: skills ?? [] })

	return {
		...providerConfig,
		...advancedConfig,
		language,
		responseLanguage,
		maskingEntries: maskingEntries ?? [],
		voiceConfig: normalizedVoice,
		shortcutsConfig: normalizedShortcuts,
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
