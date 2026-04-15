import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type SessionRecord, deleteSession, getSession } from '@/lib/db'
import { useT } from '@/lib/i18n'

import { HistoryStream } from './cards'

export function HistoryDetail({
	sessionId,
	onBack,
	onRerun,
}: {
	sessionId: string
	onBack: () => void
	onRerun: (task: string) => void
}) {
	const t = useT()
	const [session, setSession] = useState<SessionRecord | null>(null)

	useEffect(() => {
		getSession(sessionId).then((s) => setSession(s ?? null))
	}, [sessionId])

	if (!session) {
		return (
			<div className="flex items-center justify-center h-screen text-xs text-muted-foreground">
				{t('ext.history.loading')}
			</div>
		)
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onBack}
					className="cursor-pointer"
					aria-label={t('ext.header.back')}
				>
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium truncate">{t('ext.history.title')}</span>
			</header>

			{/* Task */}
			<div className="border-b px-3 py-2 bg-muted/30">
				<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
					{t('ext.task.label')}
				</div>
				<div className="text-xs font-medium" title={session.task}>
					{session.task}
				</div>
				<div className="mt-2 flex items-center gap-2">
					<button
						type="button"
						onClick={() => onRerun(session.task)}
						className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RotateCcw className="size-3" />
						{t('ext.history.runAgain')}
					</button>
					<button
						type="button"
						onClick={async () => {
							await deleteSession(sessionId)
							onBack()
						}}
						className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
					>
						<Trash2 className="size-3" />
						{t('ext.history.delete')}
					</button>
				</div>
			</div>

			{/* Events (read-only) */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2">
				<HistoryStream history={session.history} />
			</div>
		</div>
	)
}
