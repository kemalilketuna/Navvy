/**
 * React hook for using AgentController
 */
import type { AgentActivity, AgentStatus, ExecutionResult, HistoricalEvent } from '@page-agent/core'
import type { LLMConfig } from '@page-agent/llms'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type ExtensionLanguage, MultiPageAgent } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'
import { type LLMProfile, buildProfilesState } from './profiles'

export type { LLMProfile } from './profiles'

/** Language preference: undefined means follow system */
export type LanguagePreference = ExtensionLanguage | undefined

export interface AdvancedConfig {
	maxSteps?: number
	systemInstruction?: string
	experimentalLlmsTxt?: boolean
	experimentalIncludeAllTabs?: boolean
	disableNamedToolChoice?: boolean
}

export interface ExtConfig extends LLMConfig, AdvancedConfig {
	language?: LanguagePreference
	profiles: LLMProfile[]
	activeProfileId: string
}

export interface UseAgentResult {
	status: AgentStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: ExtConfig | null
	execute: (task: string) => Promise<ExecutionResult>
	stop: () => void
	configure: (config: ExtConfig) => Promise<void>
}

export function useAgent(): UseAgentResult {
	const agentRef = useRef<MultiPageAgent | null>(null)
	const [status, setStatus] = useState<AgentStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<ExtConfig | null>(null)

	useEffect(() => {
		chrome.storage.local
			.get(['llmConfig', 'language', 'advancedConfig', 'llmProfiles', 'activeProfileId'])
			.then((result) => {
				let legacyLlm = (result.llmConfig as LLMConfig) ?? DEMO_CONFIG
				const language = (result.language as ExtensionLanguage) || undefined
				const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {}

				// Auto-migrate legacy testing endpoints
				const migrated = migrateLegacyEndpoint(legacyLlm)
				if (migrated !== legacyLlm) {
					legacyLlm = migrated
					chrome.storage.local.set({ llmConfig: migrated })
				} else if (!result.llmConfig) {
					chrome.storage.local.set({ llmConfig: DEMO_CONFIG })
				}

				const { profiles, activeProfileId } = buildProfilesState(
					result.llmProfiles as LLMProfile[] | undefined,
					result.activeProfileId as string | undefined,
					legacyLlm
				)

				// Persist initial profile state if missing
				if (!result.llmProfiles || !result.activeProfileId) {
					chrome.storage.local.set({ llmProfiles: profiles, activeProfileId })
				}

				const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

				setConfig({
					baseURL: active.baseURL,
					model: active.model,
					apiKey: active.apiKey,
					...advancedConfig,
					language,
					profiles,
					activeProfileId: active.id,
				})
			})
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
			const newStatus = agent.status as AgentStatus
			setStatus(newStatus)
			if (newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error') {
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
	}, [config])

	const execute = useCallback(async (task: string) => {
		const agent = agentRef.current
		if (!agent) throw new Error('Agent not initialized')

		setCurrentTask(task)
		setHistory([])
		return agent.execute(task)
	}, [])

	const stop = useCallback(() => {
		agentRef.current?.stop()
	}, [])

	const configure = useCallback(
		async ({
			language,
			maxSteps,
			systemInstruction,
			experimentalLlmsTxt,
			experimentalIncludeAllTabs,
			disableNamedToolChoice,
			profiles,
			activeProfileId,
			baseURL,
			model,
			apiKey,
		}: ExtConfig) => {
			const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
			const llmConfig: LLMConfig = {
				baseURL: active.baseURL,
				model: active.model,
				apiKey: active.apiKey,
			}
			void baseURL
			void model
			void apiKey

			await chrome.storage.local.set({
				llmConfig,
				llmProfiles: profiles,
				activeProfileId: active.id,
			})
			if (language) {
				await chrome.storage.local.set({ language })
			} else {
				await chrome.storage.local.remove('language')
			}
			const advancedConfig: AdvancedConfig = {
				maxSteps,
				systemInstruction,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				disableNamedToolChoice,
			}
			await chrome.storage.local.set({ advancedConfig })
			setConfig({
				...llmConfig,
				...advancedConfig,
				language,
				profiles,
				activeProfileId: active.id,
			})
		},
		[]
	)

	return {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		configure,
	}
}
