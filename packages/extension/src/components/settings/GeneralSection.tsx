import type { LanguagePreference, ResponseLanguage } from '@/agent/configStore'
import { useT } from '@/lib/i18n'

interface GeneralSectionProps {
	language: LanguagePreference
	responseLanguage: ResponseLanguage
	onLanguageChange: (value: LanguagePreference) => void
	onResponseLanguageChange: (value: ResponseLanguage) => void
}

const UI_OPTIONS: {
	value: '' | NonNullable<LanguagePreference>
	labelKey?: string
	label?: string
}[] = [
	{ value: '', labelKey: 'ext.config.languageSystem' },
	{ value: 'en-US', label: 'English' },
	{ value: 'fr-FR', label: 'Français' },
	{ value: 'de-DE', label: 'Deutsch' },
	{ value: 'es-ES', label: 'Español' },
	{ value: 'it-IT', label: 'Italiano' },
	{ value: 'pt-PT', label: 'Português' },
	{ value: 'tr-TR', label: 'Türkçe' },
]

const RESPONSE_OPTIONS: { value: ResponseLanguage; labelKey?: string; label?: string }[] = [
	{ value: 'auto', labelKey: 'ext.settings.languageAuto' },
	{ value: 'en-US', label: 'English' },
	{ value: 'fr-FR', label: 'Français' },
	{ value: 'de-DE', label: 'Deutsch' },
	{ value: 'es-ES', label: 'Español' },
	{ value: 'it-IT', label: 'Italiano' },
	{ value: 'pt-PT', label: 'Português' },
	{ value: 'tr-TR', label: 'Türkçe' },
]

export function GeneralSection({
	language,
	responseLanguage,
	onLanguageChange,
	onResponseLanguageChange,
}: GeneralSectionProps) {
	const t = useT()

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.settings.uiLanguage')}</label>
				<p className="text-xs text-muted-foreground">{t('ext.settings.uiLanguageHelp')}</p>
				<select
					value={language ?? ''}
					onChange={(e) => onLanguageChange((e.target.value || undefined) as LanguagePreference)}
					className="mt-1 h-9 text-sm rounded-md border border-input bg-background px-2 cursor-pointer max-w-xs"
				>
					{UI_OPTIONS.map((opt) => (
						<option key={opt.value || 'system'} value={opt.value}>
							{opt.labelKey ? t(opt.labelKey as never) : opt.label}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.settings.responseLanguage')}</label>
				<p className="text-xs text-muted-foreground">{t('ext.settings.responseLanguageHelp')}</p>
				<select
					value={responseLanguage}
					onChange={(e) => onResponseLanguageChange(e.target.value as ResponseLanguage)}
					className="mt-1 h-9 text-sm rounded-md border border-input bg-background px-2 cursor-pointer max-w-xs"
				>
					{RESPONSE_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.labelKey ? t(opt.labelKey as never) : opt.label}
						</option>
					))}
				</select>
			</div>
		</div>
	)
}
