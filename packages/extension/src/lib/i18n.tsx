import { createContext, use, useEffect, useMemo, useState } from 'react'

import { type ExtensionLanguage, detectLanguage } from '@/agent/MultiPageAgent'

import { type TranslationKey, locales } from './locales'

export type { TranslationKey, ExtensionLanguage }

export type TranslationParams = Record<string, string | number>

function getNested(obj: unknown, path: string): string | undefined {
	return path.split('.').reduce<any>((acc, key) => acc?.[key], obj)
}

function interpolate(template: string, params: TranslationParams): string {
	return template.replace(/\{\{(\w+)\}\}/g, (m, key) =>
		params[key] != null ? String(params[key]) : m
	)
}

/**
 * Translate a key for a specific language. Falls back to English when the
 * locale is missing the key.
 */
export function translate(
	language: ExtensionLanguage,
	key: TranslationKey,
	params?: TranslationParams
): string {
	const value = getNested(locales[language], key) ?? getNested(locales['en-US'], key) ?? key
	return params ? interpolate(value, params) : value
}

interface I18nContextValue {
	t: (key: TranslationKey, params?: TranslationParams) => string
	language: ExtensionLanguage
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguage] = useState<ExtensionLanguage>(() => detectLanguage())

	useEffect(() => {
		chrome.storage.local.get('language').then((r) => {
			const stored = r.language as ExtensionLanguage | undefined
			if (stored && stored in locales) setLanguage(stored)
		})

		const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
			if (area !== 'local' || !changes.language) return
			const next = changes.language.newValue as ExtensionLanguage | undefined
			setLanguage(next && next in locales ? next : detectLanguage())
		}
		chrome.storage.onChanged.addListener(handler)
		return () => chrome.storage.onChanged.removeListener(handler)
	}, [])

	const value = useMemo<I18nContextValue>(
		() => ({
			language,
			t: (key, params) => translate(language, key, params),
		}),
		[language]
	)

	return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18nContextValue {
	const ctx = use(I18nContext)
	if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
	return ctx
}

export function useT() {
	return useI18n().t
}
