import type { TaskAttachment } from '@page-agent/core'
import { History, MoreVertical, Settings, Sparkles, SquarePen } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Composer } from '@/components/Composer'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { HistoryStream } from '@/components/cards'
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

import { modelSupportsImages } from '../../agent/providers'
import { useAgent } from '../../agent/useAgent'

type View = { name: 'chat' } | { name: 'history' } | { name: 'history-detail'; sessionId: string }

async function stashReturnTab() {
	try {
		const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (active?.id != null) {
			await chrome.storage.session.set({ settingsReturnTabId: active.id })
		}
	} catch {
		// session storage or tabs query unavailable — skip stashing
	}
}

function openSettings(section: 'general' | 'skills') {
	const url = chrome.runtime.getURL(`settings.html#${section}`)
	stashReturnTab()
		.then(() => chrome.tabs.create({ url }))
		.catch((err) => console.error('[SidePanel] Failed to open settings:', err))
}

export default function App() {
	const t = useT()
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const [attachments, setAttachments] = useState<TaskAttachment[]>([])
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		newChat,
		voiceEnabled,
		voiceState,
		startListening,
		stopListening,
	} = useAgent()

	const supportsImages = useMemo(() => {
		if (!config) return false
		const active = config.profiles.find((p) => p.id === config.activeProfileId)
		return active ? modelSupportsImages(active) : false
	}, [config])

	useEffect(() => {
		if (!supportsImages && attachments.length > 0) setAttachments([])
	}, [supportsImages, attachments.length])

	// Persist session when task finishes
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status

		if (
			prev === 'running' &&
			(status === 'completed' || status === 'error' || status === 'stopped') &&
			history.length > 0 &&
			currentTask
		) {
			const persistedStatus = status === 'stopped' ? 'error' : status
			saveSession({ task: currentTask, history, status: persistedStatus }).catch((err) =>
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
		(task: string, taskAttachments?: TaskAttachment[]) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || status === 'running') return

			setInputValue('')
			setAttachments([])
			setView({ name: 'chat' })

			execute(normalizedTask, taskAttachments).catch((error) => {
				console.error('[SidePanel] Failed to execute task:', error)
			})
		},
		[execute, status]
	)

	const handleSubmit = useCallback(() => {
		runTask(inputValue, attachments)
	}, [inputValue, attachments, runTask])

	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
	}, [stop])

	// --- Voice ---

	const pttActiveRef = useRef(false)

	const submitTranscript = useCallback(
		(text: string) => {
			const normalized = text.trim()
			if (normalized) runTask(normalized)
		},
		[runTask]
	)

	// Composer mic button: toggle capture; auto-submit the transcript on stop.
	const handleMicToggle = useCallback(() => {
		if (voiceState === 'recording') {
			stopListening()
				.then(submitTranscript)
				.catch((err) => console.error('[SidePanel] Transcription failed:', err))
		} else {
			startListening()
		}
	}, [voiceState, stopListening, startListening, submitTranscript])

	// Push-to-talk: start on key/message down, stop + submit on up. Guarded against
	// auto-repeat via pttActiveRef so a held key starts capture exactly once.
	const startPtt = useCallback(() => {
		if (pttActiveRef.current) return
		pttActiveRef.current = true
		startListening()
	}, [startListening])

	const stopPtt = useCallback(() => {
		if (!pttActiveRef.current) return
		pttActiveRef.current = false
		stopListening()
			.then(submitTranscript)
			.catch((err) => console.error('[SidePanel] Transcription failed:', err))
	}, [stopListening, submitTranscript])

	// Hold-to-talk while the side panel itself has focus.
	const holdKey = config?.voiceConfig?.holdKey
	const pushToTalk = voiceEnabled && (config?.voiceConfig?.pushToTalk ?? false)
	useEffect(() => {
		if (!pushToTalk || !holdKey) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === holdKey && !e.repeat) {
				e.preventDefault()
				startPtt()
			}
		}
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === holdKey) {
				e.preventDefault()
				stopPtt()
			}
		}
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
		}
	}, [pushToTalk, holdKey, startPtt, stopPtt])

	// Hold-to-talk bridged from the page via the content script.
	useEffect(() => {
		if (!pushToTalk) return
		const onMessage = (message: unknown) => {
			const type = (message as { type?: unknown })?.type
			if (type === 'VOICE_PTT_DOWN') startPtt()
			else if (type === 'VOICE_PTT_UP') stopPtt()
		}
		chrome.runtime.onMessage.addListener(onMessage)
		return () => chrome.runtime.onMessage.removeListener(onMessage)
	}, [pushToTalk, startPtt, stopPtt])

	// Cancel-action shortcut: the background relays the keyboard command as a
	// runtime message so it works regardless of which document holds focus.
	useEffect(() => {
		const onMessage = (message: unknown) => {
			if (
				typeof message === 'object' &&
				message !== null &&
				(message as { type?: unknown }).type === 'CANCEL_ACTION'
			) {
				handleStop()
			}
		}
		chrome.runtime.onMessage.addListener(onMessage)
		return () => chrome.runtime.onMessage.removeListener(onMessage)
	}, [handleStop])

	const handleNewChat = useCallback(() => {
		newChat()
		setInputValue('')
		setAttachments([])
		setView({ name: 'chat' })
	}, [newChat])

	// --- View routing ---

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

	// --- Chat view ---

	const isRunning = status === 'running'
	const showEmptyState = !currentTask && history.length === 0 && !isRunning

	return (
		<div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
			<div
				data-testid="shell-action-bar"
				className="relative flex items-center justify-between px-3 py-2"
			>
				<StatusDot status={status} />
				<div className="flex items-center gap-1">
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
							<DropdownMenuItem onSelect={() => openSettings('skills')}>
								<Sparkles />
								{t('ext.menu.skills')}
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => openSettings('general')}>
								<Settings />
								{t('ext.menu.settings')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

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
					<HistoryStream history={history} activity={activity} />
				</div>
			</main>

			<Composer
				ref={textareaRef}
				value={inputValue}
				onChange={setInputValue}
				onSubmit={handleSubmit}
				onStop={handleStop}
				isRunning={isRunning}
				attachments={attachments}
				onAttachmentsChange={setAttachments}
				modelSupportsImages={supportsImages}
				voiceEnabled={voiceEnabled}
				voiceState={voiceState}
				onMicToggle={handleMicToggle}
			/>
		</div>
	)
}
