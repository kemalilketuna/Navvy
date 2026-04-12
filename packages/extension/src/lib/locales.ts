/**
 * Locale registry. The English base lives in `locales/en-US.ts` and defines
 * `TranslationSchema` / `TranslationKey`; every other locale conforms to that
 * shape via its `: TranslationSchema` annotation.
 */
import type { ExtensionLanguage } from '@/agent/MultiPageAgent'

import { deDE } from './locales/de-DE'
import { type TranslationSchema, enUS } from './locales/en-US'
import { esES } from './locales/es-ES'
import { frFR } from './locales/fr-FR'
import { itIT } from './locales/it-IT'
import { ptPT } from './locales/pt-PT'
import { trTR } from './locales/tr-TR'

export type { TranslationKey, TranslationSchema } from './locales/en-US'

export const locales: Record<ExtensionLanguage, TranslationSchema> = {
	'en-US': enUS,
	'fr-FR': frFR,
	'de-DE': deDE,
	'es-ES': esES,
	'it-IT': itIT,
	'pt-PT': ptPT,
	'tr-TR': trTR,
}
