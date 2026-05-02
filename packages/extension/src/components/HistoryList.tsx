import {
	ArrowDownToLine,
	ArrowLeft,
	CheckCircle,
	History,
	RotateCcw,
	Trash2,
	XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type SessionRecord, clearSessions, deleteSession, listSessions } from '@/lib/db'
import { downloadHistoryExport } from '@/lib/history-export'
import { useT } from '@/lib/i18n'

type TFn = ReturnType<typeof useT>

function timeAgo(ts: number, t: TFn): string {
	const seconds = Math.floor((Date.now() - ts) / 1000)
	if (seconds < 60) return t('ext.history.justNow')
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return t('ext.history.minutesAgo', { n: minutes })
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return t('ext.history.hoursAgo', { n: hours })
	const days = Math.floor(hours / 24)
	return t('ext.history.daysAgo', { n: days })
}

export function HistoryList({
	onSelect,
	onBack,
	onRerun,
}: {
	onSelect: (id: string) => void
	onBack: () => void
	onRerun: (task: string) => void
}) {
	const t = useT()
	const [sessions, setSessions] = useState<SessionRecord[]>([])
	const [loading, setLoading] = useState(true)

	const load = useCallback(async () => {
		try {
			setSessions(await listSessions())
		} catch (err) {
			console.error('[HistoryList] Failed to load sessions:', err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		await deleteSession(id)
		setSessions((prev) => prev.filter((s) => s.id !== id))
	}

	const handleExport = (e: React.MouseEvent, session: SessionRecord) => {
		e.stopPropagation()
		downloadHistoryExport(session.task, session.createdAt, session.history)
	}

	const handleRerun = (e: React.MouseEvent, task: string) => {
		e.stopPropagation()
		onRerun(task)
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
					title={t('ext.header.back')}
				>
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium flex-1">{t('ext.history.title')}</span>
				{sessions.length > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={async () => {
							await clearSessions()
							setSessions([])
						}}
						className="text-[10px] text-muted-foreground hover:text-white cursor-pointer h-6 px-2"
					>
						<Trash2 className="size-3 mr-1" />
						{t('ext.history.clearAll')}
					</Button>
				)}
			</header>

			{/* List */}
			<div className="flex-1 overflow-y-auto">
				{loading && (
					<div className="flex flex-col" aria-label={t('ext.history.loading')} aria-busy="true">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="flex items-start gap-2 px-3 py-2.5 border-b">
								<div className="size-3.5 mt-0.5 rounded-full bg-muted animate-pulse shrink-0" />
								<div className="flex-1 space-y-1.5">
									<div className="h-2.5 bg-muted animate-pulse rounded w-3/4" />
									<div className="h-2 bg-muted animate-pulse rounded w-1/3" />
								</div>
							</div>
						))}
					</div>
				)}

				{!loading && sessions.length === 0 && (
					<div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
						<History className="size-8 opacity-30" />
						<p className="text-xs">{t('ext.history.noHistory')}</p>
					</div>
				)}

				{sessions.map((session) => (
					<div
						key={session.id}
						role="button"
						tabIndex={0}
						onClick={() => onSelect(session.id)}
						className="w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-2 group"
					>
						{/* Status icon */}
						{session.status === 'completed' ? (
							<CheckCircle className="size-3.5 text-green-500 shrink-0 mt-0.5" />
						) : (
							<XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
						)}

						{/* Content */}
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium truncate">{session.task}</p>
							<div className="flex items-center mt-0.5">
								<p className="text-[10px] text-muted-foreground">
									{timeAgo(session.createdAt, t)} ·{' '}
									{t('ext.history.stepsCount', { n: session.history.length })}
								</p>
								<div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										type="button"
										onClick={(e) => handleRerun(e, session.task)}
										className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
										title={t('ext.history.runAgainTitle')}
										aria-label={`${t('ext.history.runAgainTitle')}: ${session.task}`}
									>
										<RotateCcw className="size-3" />
									</button>
									<button
										type="button"
										onClick={(e) => handleExport(e, session)}
										className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
										title={t('ext.history.exportTitle')}
										aria-label={`${t('ext.history.exportTitle')}: ${session.task}`}
									>
										<ArrowDownToLine className="size-3" />
									</button>
									<button
										type="button"
										onClick={(e) => handleDelete(e, session.id)}
										className="p-0.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
										title={t('ext.history.deleteTitle')}
										aria-label={`${t('ext.history.deleteTitle')}: ${session.task}`}
									>
										<Trash2 className="size-3" />
									</button>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
