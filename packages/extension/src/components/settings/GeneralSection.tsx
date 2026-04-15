import type { LanguagePreference, ResponseLanguage } from '@/agent/configStore'
import { Select } from '@/components/ui/select'
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
				<Select
					className="mt-1 max-w-xs"
					value={language ?? ''}
					onChange={(v) => onLanguageChange((v || undefined) as LanguagePreference)}
					options={UI_OPTIONS.map((opt) => ({
						value: opt.value,
						label: opt.labelKey ? t(opt.labelKey as never) : (opt.label ?? ''),
					}))}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.settings.responseLanguage')}</label>
				<p className="text-xs text-muted-foreground">{t('ext.settings.responseLanguageHelp')}</p>
				<Select
					className="mt-1 max-w-xs"
					value={responseLanguage}
					onChange={(v) => onResponseLanguageChange(v as ResponseLanguage)}
					options={RESPONSE_OPTIONS.map((opt) => ({
						value: opt.value,
						label: opt.labelKey ? t(opt.labelKey as never) : (opt.label ?? ''),
					}))}
				/>
			</div>
		</div>
	)
}
