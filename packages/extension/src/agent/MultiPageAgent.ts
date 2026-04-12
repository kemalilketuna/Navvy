import { type AgentConfig, PageAgentCore } from '@page-agent/core'

import { RemotePageController } from './RemotePageController'
import { TabsController } from './TabsController'
import SYSTEM_PROMPT from './system_prompt.md?raw'
import { createTabTools } from './tabTools'

/** Supported UI languages for the extension (independent of @page-agent/core). */
export type ExtensionLanguage = 'en-US' | 'fr-FR' | 'de-DE' | 'es-ES' | 'it-IT' | 'pt-PT' | 'tr-TR'

/** Natural-language names handed to the LLM via the system prompt. */
export const LANGUAGE_NAMES: Record<ExtensionLanguage, string> = {
	'en-US': 'English',
	'fr-FR': 'Français',
	'de-DE': 'Deutsch',
	'es-ES': 'Español',
	'it-IT': 'Italiano',
	'pt-PT': 'Português',
	'tr-TR': 'Türkçe',
}

/** Detect user language from browser settings. Falls back to en-US. */
export function detectLanguage(): ExtensionLanguage {
	const lang = (navigator.language || navigator.languages?.[0] || 'en-US').toLowerCase()
	if (lang.startsWith('fr')) return 'fr-FR'
	if (lang.startsWith('de')) return 'de-DE'
	if (lang.startsWith('es')) return 'es-ES'
	if (lang.startsWith('it')) return 'it-IT'
	if (lang.startsWith('pt')) return 'pt-PT'
	if (lang.startsWith('tr')) return 'tr-TR'
	return 'en-US'
}

interface MultiPageAgentConfig extends Omit<AgentConfig, 'language'> {
	language?: ExtensionLanguage
	includeInitialTab?: boolean
	experimentalIncludeAllTabs?: boolean
}

/**
 * MultiPageAgent
 * - use with extension
 * - can be used from a side panel or a content script
 */
export class MultiPageAgent extends PageAgentCore {
	constructor(config: MultiPageAgentConfig) {
		// multi page controller
		const tabsController = new TabsController()
		const pageController = new RemotePageController(tabsController)
		const customTools = createTabTools(tabsController)

		// system prompt - auto-detect language if not specified
		const language = config.language ?? detectLanguage()
		const targetLanguage = LANGUAGE_NAMES[language] ?? 'English'

		// Strip language so it doesn't reach the core (which has a narrower type).
		const { language: _ignored, ...restConfig } = config
		const systemPrompt = SYSTEM_PROMPT.replace(
			/Default working language: \*\*.*?\*\*/,
			`Default working language: **${targetLanguage}**`
		)

		const includeInitialTab = config.includeInitialTab ?? true
		const experimentalIncludeAllTabs = config.experimentalIncludeAllTabs ?? false

		/**
		 * When the agent is in side-panel and user closed the side-panel.
		 * There is no chance for isAgentRunning to be set false.
		 * (unload event doesn't work well in side panel.)
		 * (I'm trying not to use long-lived connection because the lifecycle of a sw is hard to predict.)
		 * This heartbeat mechanism acts as a backup.
		 */
		let heartBeatInterval: null | number = null

		super({
			...restConfig,
			pageController: pageController as any,
			customTools: customTools,
			customSystemPrompt: systemPrompt,

			onBeforeTask: async (agent) => {
				await tabsController.init(agent.task, { includeInitialTab, experimentalIncludeAllTabs })

				heartBeatInterval = window.setInterval(() => {
					chrome.storage.local.set({
						agentHeartbeat: Date.now(),
					})
				}, 1_000)

				await chrome.storage.local.set({
					isAgentRunning: true,
				})
			},

			onAfterTask: async () => {
				if (heartBeatInterval) {
					window.clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}

				await chrome.storage.local.set({
					isAgentRunning: false,
				})
			},

			onBeforeStep: async (agent) => {
				if (!tabsController.currentTabId) return
				// make sure the current tab is loaded before the step starts
				await tabsController.waitUntilTabLoaded(tabsController.currentTabId!)
			},

			onDispose: () => {
				if (heartBeatInterval) {
					window.clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}

				chrome.storage.local.set({
					isAgentRunning: false,
				})

				tabsController.dispose()
			},
		})
	}
}
