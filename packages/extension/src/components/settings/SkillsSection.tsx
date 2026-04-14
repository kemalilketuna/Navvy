import { Sparkles } from 'lucide-react'

import { useT } from '@/lib/i18n'

export function SkillsSection() {
	const t = useT()

	return (
		<div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground py-16">
			<Sparkles className="size-10 opacity-60" />
			<h3 className="text-base font-medium text-foreground">{t('ext.skills.comingSoon')}</h3>
			<p className="max-w-md text-sm">{t('ext.skills.description')}</p>
		</div>
	)
}
