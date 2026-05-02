/**
 * React hook for using AgentController
 */
import type {
	AgentActivity,
	AgentStatus,
	ExecutionResult,
	HistoricalEvent,
	TaskAttachment,
} from '@page-agent/core'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { VoiceController, VoiceState } from '@/voice/VoiceController'
import { createVoiceController } from '@/voice/clients'

import { MultiPageAgent } from './MultiPageAgent'
import {
	type AdvancedConfig,
	type ExtConfig,
	type LanguagePreference,
	loadConfig,
	saveConfig,
} from './configStore'

export type { LLMProfile } from './profiles'
export type { AdvancedConfig, ExtConfig, LanguagePreference }
export type { VoiceState }

// Core reports 'error' for any aborted task; map to 'stopped' when the user explicitly stopped.
export type ExtStatus = AgentStatus | 'stopped'

export interface UseAgentResult {
	status: ExtStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: ExtConfig | null
	execute: (task: string, attachments?: TaskAttachment[]) => Promise<ExecutionResult>
	stop: () => void
	newChat: () => void
	configure: (config: ExtConfig) => Promise<void>
	/** Voice: true when voice mode is enabled and a controller is active. */
	voiceEnabled: boolean
	voiceState: VoiceState
	startListening: () => Promise<void>
	/** Stop capture and return the transcript (empty when routed to a pending ask_user). */
	stopListening: () => Promise<string>
	cancelListening: () => void
	speak: (text: string) => void
	cancelSpeaking: () => void
}

export function useAgent(): UseAgentResult {
	const agentRef = useRef<MultiPageAgent | null>(null)
	const stopRequestedRef = useRef(false)
	const voiceRef = useRef<VoiceController | null>(null)
	// Whether to speak final answers (mirrors voiceConfig.autoSpeakResponses).
	const autoSpeakRef = useRef(false)
	// Resolver for an in-flight ask_user awaiting a spoken answer.
	const pendingAskRef = useRef<((answer: string) => void) | null>(null)
	const [status, setStatus] = useState<ExtStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<ExtConfig | null>(null)
	const [resetCounter, setResetCounter] = useState(0)
	const [voiceState, setVoiceState] = useState<VoiceState>('idle')

	useEffect(() => {
		loadConfig().then(setConfig)
	}, [])

	// Pick up settings changes saved from the standalone settings page.
	useEffect(() => {
		const onChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
			if (areaName !== 'local') return
			if (
				'llmConfig' in changes ||
				'language' in changes ||
				'advancedConfig' in changes ||
				'llmProfiles' in changes ||
				'activeProfileId' in changes ||
				'maskingEntries' in changes ||
				'voiceConfig' in changes
			) {
				loadConfig().then(setConfig)
			}
		}
		chrome.storage.onChanged.addListener(onChange)
		return () => chrome.storage.onChanged.removeListener(onChange)
	}, [])

	useEffect(() => {
		if (!config) return

		const {
			systemInstruction,
			profiles,
			activeProfileId,
			language: _uiLanguage,
			// voiceConfig is UI-only — keep it out of the core constructor.
			voiceConfig,
			...agentConfig
		} = config
		void profiles
		void activeProfileId
		void _uiLanguage
		const agent = new MultiPageAgent({
			...agentConfig,
			instructions: systemInstruction ? { system: systemInstruction } : undefined,
		})
		agentRef.current = agent

		// Voice: build a controller from the (UI-only) voiceConfig, reusing the
		// active chat credentials for OpenAI-compatible audio providers.
		const voiceController = createVoiceController(voiceConfig, {
			baseURL: config.baseURL,
			apiKey: config.apiKey,
		})
		voiceRef.current = voiceController
		autoSpeakRef.current = Boolean(voiceController && voiceConfig.autoSpeakResponses)
		setVoiceState('idle')

		const handleVoiceState = (e: Event) => setVoiceState((e as CustomEvent).detail as VoiceState)
		voiceController?.addEventListener('statechange', handleVoiceState)

		// Wire ask_user to voice: speak the question, then resolve with the next
		// transcript. Capture is NOT auto-armed — the user starts the mic when
		// ready, and stopListening() routes that transcript to this pending ask.
		// Must be set before execute() (which drops the ask_user tool when unset).
		if (voiceController) {
			agent.onAskUser = async (question: string): Promise<string> => {
				try {
					await voiceController.speak(question)
				} catch {
					// speech failure shouldn't block the question
				}
				return new Promise<string>((resolve) => {
					pendingAskRef.current = resolve
				})
			}
		}

		const handleStatusChange = (e: Event) => {
			const coreStatus = agent.status as AgentStatus
			const mapped: ExtStatus =
				coreStatus === 'error' && stopRequestedRef.current ? 'stopped' : coreStatus
			if (coreStatus === 'running') {
				stopRequestedRef.current = false
			}
			setStatus(mapped)
			if (
				mapped === 'idle' ||
				mapped === 'completed' ||
				mapped === 'error' ||
				mapped === 'stopped'
			) {
				setActivity(null)
			}
		}

		const handleHistoryChange = (e: Event) => {
			setHistory([...agent.history])
		}

		const handleActivity = (e: Event) => {
			const newActivity = (e as CustomEvent).detail as AgentActivity
			setActivity(newActivity)
		}

		agent.addEventListener('statuschange', handleStatusChange)
		agent.addEventListener('historychange', handleHistoryChange)
		agent.addEventListener('activity', handleActivity)

		return () => {
			agent.removeEventListener('statuschange', handleStatusChange)
			agent.removeEventListener('historychange', handleHistoryChange)
			agent.removeEventListener('activity', handleActivity)
			voiceController?.removeEventListener('statechange', handleVoiceState)
			if (pendingAskRef.current) {
				pendingAskRef.current('')
				pendingAskRef.current = null
			}
			voiceController?.dispose()
			voiceRef.current = null
			agent.dispose()
		}
	}, [config, resetCounter])

	const execute = useCallback(async (task: string, attachments?: TaskAttachment[]) => {
		const agent = agentRef.current
		if (!agent) throw new Error('Agent not initialized')

		setCurrentTask(task)
		setHistory([])
		const result = await agent.execute(
			task,
			attachments && attachments.length > 0 ? { attachments } : undefined
		)
		// Speak the final answer when auto-speak is on and the task succeeded.
		if (voiceRef.current && autoSpeakRef.current && result?.success && result.data) {
			voiceRef.current.speak(result.data).catch(() => {})
		}
		return result
	}, [])

	const stop = useCallback(() => {
		stopRequestedRef.current = true
		agentRef.current?.stop()
		voiceRef.current?.cancelSpeaking()
		voiceRef.current?.cancelListening()
		// Unblock any ask_user waiting on a spoken answer.
		if (pendingAskRef.current) {
			const resolve = pendingAskRef.current
			pendingAskRef.current = null
			resolve('')
		}
	}, [])

	const newChat = useCallback(() => {
		stopRequestedRef.current = false
		agentRef.current?.stop()
		voiceRef.current?.cancelSpeaking()
		voiceRef.current?.cancelListening()
		setHistory([])
		setActivity(null)
		setCurrentTask('')
		setStatus('idle')
		setResetCounter((n) => n + 1)
	}, [])

	const configure = useCallback(async (next: ExtConfig) => {
		const saved = await saveConfig(next)
		setConfig(saved)
	}, [])

	const startListening = useCallback(async (): Promise<void> => {
		await voiceRef.current?.startListening()
	}, [])

	const stopListening = useCallback(async (): Promise<string> => {
		const controller = voiceRef.current
		if (!controller) return ''
		const text = await controller.stopListening()
		// Route the transcript to a pending ask_user instead of the composer.
		if (pendingAskRef.current) {
			const resolve = pendingAskRef.current
			pendingAskRef.current = null
			resolve(text)
			return ''
		}
		return text
	}, [])

	const cancelListening = useCallback(() => {
		if (pendingAskRef.current) {
			const resolve = pendingAskRef.current
			pendingAskRef.current = null
			resolve('')
		}
		voiceRef.current?.cancelListening()
	}, [])

	const speak = useCallback((text: string) => {
		voiceRef.current?.speak(text).catch((err) => {
			console.error('[useAgent] speak failed:', err)
		})
	}, [])

	const cancelSpeaking = useCallback(() => {
		voiceRef.current?.cancelSpeaking()
	}, [])

	return {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		newChat,
		configure,
		voiceEnabled: config?.voiceConfig?.enabled ?? false,
		voiceState,
		startListening,
		stopListening,
		cancelListening,
		speak,
		cancelSpeaking,
	}
}
