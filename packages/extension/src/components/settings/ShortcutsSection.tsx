import { Keyboard, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { DEFAULT_SHORTCUTS, type ShortcutsConfig, formatKeyCode } from '@/lib/shortcuts'

interface ShortcutsSectionProps {
	value: ShortcutsConfig
	onChange: (value: ShortcutsConfig) => void
}

interface KeyCaptureProps {
	code: string
	defaultCode: string
	onCapture: (code: string) => void
}

function KeyCapture({ code, defaultCode, onCapture }: KeyCaptureProps) {
	const t = useT()
	const [listening, setListening] = useState(false)

	useEffect(() => {
		if (!listening) return
		const onKeyDown = (e: KeyboardEvent) => {
			e.preventDefault()
			e.stopPropagation()
			onCapture(e.code)
			setListening(false)
		}
		// Capture phase so the binding is recorded before anything else reacts.
		window.addEventListener('keydown', onKeyDown, true)
		return () => window.removeEventListener('keydown', onKeyDown, true)
	}, [listening, onCapture])

	return (
		<div className="flex shrink-0 items-center gap-1">
			<Button
				type="button"
				variant={listening ? 'default' : 'outline'}
				size="sm"
				className="min-w-28 cursor-pointer font-mono"
				onClick={() => setListening((v) => !v)}
			>
				<Keyboard className="size-4" />
				{listening ? t('ext.shortcuts.pressKey') : formatKeyCode(code)}
			</Button>
			{/* Always rendered (disabled at default) so the row layout never shifts. */}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="cursor-pointer text-muted-foreground"
				disabled={code === defaultCode}
				title={t('ext.shortcuts.reset')}
				aria-label={t('ext.shortcuts.reset')}
				onClick={() => onCapture(defaultCode)}
			>
				<RotateCcw className="size-4" />
			</Button>
		</div>
	)
}

export function ShortcutsSection({ value, onChange }: ShortcutsSectionProps) {
	const t = useT()

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-base font-semibold">{t('ext.shortcuts.title')}</h2>
				<p className="text-sm text-muted-foreground">{t('ext.shortcuts.description')}</p>
			</div>

			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm">{t('ext.shortcuts.cancel')}</span>
					<span className="text-xs text-muted-foreground">{t('ext.shortcuts.cancelHelp')}</span>
				</div>
				<KeyCapture
					code={value.cancelKeyCode}
					defaultCode={DEFAULT_SHORTCUTS.cancelKeyCode}
					onCapture={(cancelKeyCode) => onChange({ ...value, cancelKeyCode })}
				/>
			</div>

			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm">{t('ext.shortcuts.pushToTalk')}</span>
					<span className="text-xs text-muted-foreground">{t('ext.shortcuts.pushToTalkHelp')}</span>
				</div>
				<KeyCapture
					code={value.pttKeyCode}
					defaultCode={DEFAULT_SHORTCUTS.pttKeyCode}
					onCapture={(pttKeyCode) => onChange({ ...value, pttKeyCode })}
				/>
			</div>
		</div>
	)
}
