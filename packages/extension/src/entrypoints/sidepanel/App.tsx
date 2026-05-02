import type { TaskAttachment } from '@page-agent/core'
import { GraduationCap, History, MoreVertical, Settings, Sparkles, SquarePen } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Composer } from '@/components/Composer'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { TeachScreen } from '@/components/TeachScreen'
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
import { DEFAULT_SHORTCUTS } from '@/lib/shortcuts'
import { type MicPermissionState, queryMicPermission } from '@/voice/micPermission'

import { modelSupportsImages } from '../../agent/providers'
import { useAgent } from '../../agent/useAgent'

type View =
	| { name: 'chat' }
	| { name: 'history' }
	| { name: 'history-detail'; sessionId: string }
	| { name: 'teach' }

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

function openSettings(section: 'general' | 'skills' | 'voice') {
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
		return modelSupportsImages(config)
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

	// Track mic permission so we can warn up front instead of after a failed
	// recording. The side panel can't prompt; settings (a tab) can.
	const [micPermission, setMicPermission] = useState<MicPermissionState>('unknown')
	useEffect(() => {
		if (!voiceEnabled) return
		if (!navigator.permissions) {
			queryMicPermission().then(setMicPermission)
			return
		}
		let active = true
		let status: PermissionStatus | null = null
		navigator.permissions
			.query({ name: 'microphone' as PermissionName })
			.then((s) => {
				if (!active) return
				status = s
				setMicPermission(s.state as MicPermissionState)
				s.onchange = () => setMicPermission(s.state as MicPermissionState)
			})
			.catch(() => queryMicPermission().then(setMicPermission))
		return () => {
			active = false
			if (status) status.onchange = null
		}
	}, [voiceEnabled])

	const warnMicBlocked = useCallback(() => {
		toast.warning(t('ext.voice.micDenied'), {
			action: { label: t('ext.voice.micGrant'), onClick: () => openSettings('voice') },
		})
	}, [t])

	// Heads-up the moment the panel opens with voice on but the mic not granted.
	const micWarnedRef = useRef(false)
	useEffect(() => {
		if (!voiceEnabled || micPermission === 'unknown') return
		if (micPermission === 'granted') {
			micWarnedRef.current = false
			return
		}
		if (!micWarnedRef.current) {
			micWarnedRef.current = true
			warnMicBlocked()
		}
	}, [voiceEnabled, micPermission, warnMicBlocked])

	// True when capture would fail for lack of permission (skip the doomed attempt).
	const micUnavailable = micPermission === 'denied' || micPermission === 'prompt'

	// Empty result means no speech was captured — tell the user instead of
	// silently doing nothing, so a failed capture is always visible.
	const submitTranscript = useCallback(
		(text: string) => {
			const normalized = text.trim()
			if (normalized) runTask(normalized)
			else toast.warning(t('ext.input.voice.noSpeech'))
		},
		[runTask, t]
	)

	const reportVoiceError = useCallback(
		(err: unknown) => {
			console.error('[SidePanel] Transcription failed:', err)
			const message = err instanceof Error ? err.message : String(err)
			// Blocked-mic errors are fixable from settings (which opens in a tab and
			// can show the permission prompt), so offer a shortcut.
			const micBlocked = /microphone/i.test(message)
			toast.error(
				`${t('ext.input.voice.failed')}: ${message}`,
				micBlocked
					? { action: { label: t('ext.voice.micGrant'), onClick: () => openSettings('voice') } }
					: undefined
			)
		},
		[t]
	)

	// Composer mic button: toggle capture; auto-submit the transcript on stop.
	const handleMicToggle = useCallback(() => {
		if (voiceState === 'recording') {
			stopListening().then(submitTranscript).catch(reportVoiceError)
		} else if (micUnavailable) {
			warnMicBlocked()
		} else {
			startListening().catch(reportVoiceError)
		}
	}, [
		voiceState,
		micUnavailable,
		warnMicBlocked,
		stopListening,
		startListening,
		submitTranscript,
		reportVoiceError,
	])

	// Push-to-talk: start on press, stop + submit on release. Guarded against
	// auto-repeat via pttActiveRef so a held key starts capture exactly once.
	const startPtt = useCallback(() => {
		if (pttActiveRef.current) return
		if (micUnavailable) {
			warnMicBlocked()
			return
		}
		pttActiveRef.current = true
		startListening().catch(reportVoiceError)
	}, [micUnavailable, warnMicBlocked, startListening, reportVoiceError])

	const stopPtt = useCallback(() => {
		if (!pttActiveRef.current) return
		pttActiveRef.current = false
		stopListening().then(submitTranscript).catch(reportVoiceError)
	}, [stopListening, submitTranscript, reportVoiceError])

	const pttKeyCode = config?.shortcutsConfig?.pttKeyCode ?? DEFAULT_SHORTCUTS.pttKeyCode
	const cancelKeyCode = config?.shortcutsConfig?.cancelKeyCode ?? DEFAULT_SHORTCUTS.cancelKeyCode

	// Hold-to-talk on the configured key while the side panel itself has focus.
	useEffect(() => {
		if (!voiceEnabled) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code !== pttKeyCode || e.repeat) return
			e.preventDefault()
			startPtt()
		}
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.code !== pttKeyCode) return
			e.preventDefault()
			stopPtt()
		}
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
		}
	}, [voiceEnabled, pttKeyCode, startPtt, stopPtt])

	// Hold-to-talk bridged from the page via the content script, so it works
	// while the user is looking at the page rather than the panel.
	useEffect(() => {
		if (!voiceEnabled) return
		const onMessage = (message: unknown) => {
			const type = (message as { type?: unknown })?.type
			if (type === 'VOICE_PTT_DOWN') startPtt()
			else if (type === 'VOICE_PTT_UP') stopPtt()
		}
		chrome.runtime.onMessage.addListener(onMessage)
		return () => chrome.runtime.onMessage.removeListener(onMessage)
	}, [voiceEnabled, startPtt, stopPtt])

	// Cancel-action shortcut. Only active while a task is running so it never
	// hijacks the page's or panel's normal key handling otherwise. In-panel key
	// presses are handled here; page presses are relayed by the content script.
	useEffect(() => {
		if (status !== 'running') return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === cancelKeyCode) handleStop()
		}
		const onMessage = (message: unknown) => {
			if ((message as { type?: unknown })?.type === 'CANCEL_ACTION') handleStop()
		}
		window.addEventListener('keydown', onKeyDown)
		chrome.runtime.onMessage.addListener(onMessage)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			chrome.runtime.onMessage.removeListener(onMessage)
		}
	}, [status, cancelKeyCode, handleStop])

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

	if (view.name === 'teach') {
		return (
			<TeachScreen
				onClose={() => setView({ name: 'chat' })}
				voiceEnabled={voiceEnabled}
				voiceState={voiceState}
				startListening={startListening}
				stopListening={stopListening}
				micUnavailable={micUnavailable}
				onMicBlocked={warnMicBlocked}
				llm={{
					baseURL: config?.baseURL ?? '',
					model: config?.model,
					apiKey: config?.apiKey,
					disableNamedToolChoice: config?.disableNamedToolChoice,
				}}
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
						onClick={() => setView({ name: 'teach' })}
						className="h-7 w-7 cursor-pointer text-muted-foreground hover:bg-white/5 hover:text-foreground"
						aria-label={t('ext.teach.open')}
						title={t('ext.teach.open')}
					>
						<GraduationCap className="size-4" />
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
