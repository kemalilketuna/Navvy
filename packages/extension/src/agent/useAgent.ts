/**
 * React hook for using AgentController
 */
import type { AgentActivity, AgentStatus, ExecutionResult, HistoricalEvent } from '@page-agent/core'
import { useCallback, useEffect, useRef, useState } from 'react'

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

// Core reports 'error' for any aborted task; map to 'stopped' when the user explicitly stopped.
export type ExtStatus = AgentStatus | 'stopped'

export interface UseAgentResult {
	status: ExtStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: ExtConfig | null
	execute: (task: string) => Promise<ExecutionResult>
	stop: () => void
	newChat: () => void
	configure: (config: ExtConfig) => Promise<void>
}

export function useAgent(): UseAgentResult {
	const agentRef = useRef<MultiPageAgent | null>(null)
	const stopRequestedRef = useRef(false)
	const [status, setStatus] = useState<ExtStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<ExtConfig | null>(null)
	const [resetCounter, setResetCounter] = useState(0)

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
				'activeProfileId' in changes
			) {
				loadConfig().then(setConfig)
			}
		}
		chrome.storage.onChanged.addListener(onChange)
		return () => chrome.storage.onChanged.removeListener(onChange)
	}, [])

	useEffect(() => {
		if (!config) return

		const { systemInstruction, profiles, activeProfileId, ...agentConfig } = config
		void profiles
		void activeProfileId
		const agent = new MultiPageAgent({
			...agentConfig,
			instructions: systemInstruction ? { system: systemInstruction } : undefined,
		})
		agentRef.current = agent

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
			agent.dispose()
		}
	}, [config, resetCounter])

	const execute = useCallback(async (task: string) => {
		const agent = agentRef.current
		if (!agent) throw new Error('Agent not initialized')

		setCurrentTask(task)
		setHistory([])
		return agent.execute(task)
	}, [])

	const stop = useCallback(() => {
		stopRequestedRef.current = true
		agentRef.current?.stop()
	}, [])

	const newChat = useCallback(() => {
		stopRequestedRef.current = false
		agentRef.current?.stop()
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
	}
}
