import { History, MoreVertical, Settings, Sparkles, SquarePen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Composer } from '@/components/Composer'
import { ConfigPanel } from '@/components/ConfigPanel'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { SkillsPanel } from '@/components/SkillsPanel'
import { ActivityCard, EventCard } from '@/components/cards'
import { EmptyState, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { saveSession } from '@/lib/db'
import { useT } from '@/lib/i18n'

import { useAgent } from '../../agent/useAgent'

type View =
	| { name: 'chat' }
	| { name: 'config' }
	| { name: 'history' }
	| { name: 'history-detail'; sessionId: string }
	| { name: 'skills' }

export default function App() {
	const t = useT()
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const { status, history, activity, currentTask, config, execute, stop, newChat, configure } =
		useAgent()

	// Persist session when task finishes
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status

		if (
			prev === 'running' &&
			(status === 'completed' || status === 'error') &&
			history.length > 0 &&
			currentTask
		) {
			saveSession({ task: currentTask, history, status }).catch((err) =>
				console.error('[SidePanel] Failed to save session:', err)
			)
		}
	}, [status, history, currentTask])

	// Auto-scroll to bottom on new events
	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [history, activity])

	const runTask = useCallback(
		(task: string) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || status === 'running') return

			setInputValue('')
			setView({ name: 'chat' })

			execute(normalizedTask).catch((error) => {
				console.error('[SidePanel] Failed to execute task:', error)
			})
		},
		[execute, status]
	)

	const handleSubmit = useCallback(() => {
		runTask(inputValue)
	}, [inputValue, runTask])

	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
	}, [stop])

	const handleNewChat = useCallback(() => {
		newChat()
		setInputValue('')
		setView({ name: 'chat' })
	}, [newChat])

	// --- View routing ---

	if (view.name === 'config') {
		return (
			<ConfigPanel
				config={config}
				onSave={async (newConfig) => {
					await configure(newConfig)
					setView({ name: 'chat' })
				}}
				onClose={() => setView({ name: 'chat' })}
			/>
		)
	}

	if (view.name === 'history') {
		return (
			<HistoryList
				onSelect={(id) => setView({ name: 'history-detail', sessionId: id })}
				onBack={() => setView({ name: 'chat' })}
				onRerun={runTask}
			/>
		)
	}

	if (view.name === 'history-detail') {
		return (
			<HistoryDetail
				sessionId={view.sessionId}
				onBack={() => setView({ name: 'history' })}
				onRerun={runTask}
			/>
		)
	}

	if (view.name === 'skills') {
		return <SkillsPanel onClose={() => setView({ name: 'chat' })} />
	}

	// --- Chat view ---

	const isRunning = status === 'running'
	const showEmptyState = !currentTask && history.length === 0 && !isRunning

	return (
		<div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
			{/* Action bar — no border, no separate header bar. Mirrors the
			    Claude-style shell where Chrome's native side-panel chrome
			    already shows the extension name. */}
			<div
				data-testid="shell-action-bar"
				className="relative flex items-center justify-between px-3 py-2"
			>
				<StatusDot status={status} />
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setView({ name: 'history' })}
						className="h-7 w-7 cursor-pointer text-muted-foreground hover:bg-white/5 hover:text-foreground"
						aria-label={t('ext.header.history')}
						title={t('ext.header.history')}
					>
						<History className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleNewChat}
						className="h-7 w-7 cursor-pointer text-muted-foreground hover:bg-white/5 hover:text-foreground"
						aria-label={t('ext.header.newChat')}
						title={t('ext.header.newChat')}
					>
						<SquarePen className="size-4" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 cursor-pointer text-muted-foreground hover:bg-white/5 hover:text-foreground"
								aria-label={t('ext.header.menu')}
								title={t('ext.header.menu')}
							>
								<MoreVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onSelect={() => setView({ name: 'skills' })}>
								<Sparkles />
								{t('ext.menu.skills')}
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setView({ name: 'config' })}>
								<Settings />
								{t('ext.menu.settings')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Content */}
			<main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2">
				{currentTask && (
					<div className="mb-3 px-0.5">
						<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
							{t('ext.task.label')}
						</div>
						<div className="mt-0.5 text-sm font-medium text-foreground" title={currentTask}>
							{currentTask}
						</div>
					</div>
				)}

				<div
					ref={historyRef}
					data-testid="shell-main"
					className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
				>
					{showEmptyState && <EmptyState />}
					{history.map((event, index) => (
						<EventCard key={index} event={event} />
					))}
					{activity && <ActivityCard activity={activity} />}
				</div>
			</main>

			<Composer
				ref={textareaRef}
				value={inputValue}
				onChange={setInputValue}
				onSubmit={handleSubmit}
				onStop={handleStop}
				isRunning={isRunning}
			/>
		</div>
	)
}
