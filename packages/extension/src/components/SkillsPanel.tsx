import { CornerUpLeft, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

interface SkillsPanelProps {
	onClose: () => void
}

export function SkillsPanel({ onClose }: SkillsPanelProps) {
	const t = useT()

	return (
		<div className="flex h-screen flex-col gap-4 p-4 relative">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold">{t('ext.skills.title')}</h2>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					className="absolute top-2 right-3 cursor-pointer"
					aria-label={t('ext.header.back')}
				>
					<CornerUpLeft className="size-3.5" />
				</Button>
			</div>

			<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
				<Sparkles className="size-8 opacity-60" />
				<h3 className="text-sm font-medium text-foreground">{t('ext.skills.comingSoon')}</h3>
				<p className="max-w-xs text-xs">{t('ext.skills.description')}</p>
			</div>
		</div>
	)
}
