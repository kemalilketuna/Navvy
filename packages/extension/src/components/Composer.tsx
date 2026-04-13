import { ArrowUp, Mic, Plus, Square } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, forwardRef } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface ComposerProps {
	readonly value: string
	readonly onChange: (value: string) => void
	readonly onSubmit: () => void
	readonly onStop: () => void
	readonly isRunning: boolean
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
	{ value, onChange, onSubmit, onStop, isRunning },
	ref
) {
	const t = useT()

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			if (!isRunning) onSubmit()
		}
	}

	function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
		onChange(e.target.value)
	}

	const canSend = value.trim().length > 0 && !isRunning

	return (
		<div
			data-testid="composer"
			className="relative mx-3 mb-3 rounded-xl border border-white/5 bg-neutral-900/80 px-3 pt-2 pb-2 shadow-sm backdrop-blur"
		>
			<Textarea
				ref={ref}
				data-testid="command-input"
				className="min-h-12 resize-none border-none bg-transparent px-0 pt-1 pb-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
				value={value}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={t('ext.input.placeholder')}
				disabled={isRunning}
			/>
			<div className="mt-1 flex items-center justify-end">
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled
						className="size-7 text-muted-foreground hover:bg-white/5"
						aria-label="Voice (coming soon)"
						title="Voice (coming soon)"
					>
						<Mic className="size-4" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled
						className="size-7 text-muted-foreground hover:bg-white/5"
						aria-label="Attach (coming soon)"
						title="Attach (coming soon)"
					>
						<Plus className="size-4" aria-hidden="true" />
					</Button>
					{isRunning ? (
						<Button
							type="button"
							variant="destructive"
							size="icon"
							onClick={onStop}
							className="size-7"
							aria-label={t('ext.input.stop')}
							title={t('ext.input.stop')}
						>
							<Square className="size-3.5" aria-hidden="true" />
						</Button>
					) : (
						<Button
							type="button"
							size="icon"
							onClick={onSubmit}
							disabled={!canSend}
							className={cn(
								'size-7 bg-amber-600 text-white hover:bg-amber-500',
								'disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-amber-600/50 disabled:opacity-100'
							)}
							aria-label={t('ext.input.send')}
							title={t('ext.input.send')}
						>
							<ArrowUp className="size-4" aria-hidden="true" />
						</Button>
					)}
				</div>
			</div>
		</div>
	)
})
