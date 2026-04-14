import type { LanguagePreference } from '@/agent/configStore'
import { useT } from '@/lib/i18n'

interface GeneralSectionProps {
	language: LanguagePreference
	onLanguageChange: (value: LanguagePreference) => void
}

export function GeneralSection({ language, onLanguageChange }: GeneralSectionProps) {
	const t = useT()

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.config.responseLanguage')}</label>
				<p className="text-xs text-muted-foreground">{t('ext.settings.languageHelp')}</p>
				<select
					value={language ?? ''}
					onChange={(e) => onLanguageChange((e.target.value || undefined) as LanguagePreference)}
					className="mt-1 h-9 text-sm rounded-md border border-input bg-background px-2 cursor-pointer max-w-xs"
				>
					<option value="">{t('ext.config.languageSystem')}</option>
					<option value="en-US">English</option>
					<option value="fr-FR">Français</option>
					<option value="de-DE">Deutsch</option>
					<option value="es-ES">Español</option>
					<option value="it-IT">Italiano</option>
					<option value="pt-PT">Português</option>
					<option value="tr-TR">Türkçe</option>
				</select>
			</div>
		</div>
	)
}
