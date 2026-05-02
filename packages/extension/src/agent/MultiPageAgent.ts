import { type AgentConfig, PageAgentCore } from '@page-agent/core'

import { RemotePageController } from './RemotePageController'
import { TabsController } from './TabsController'
import {
	type MaskingEntry,
	activeEntries,
	buildMaskingInstructions,
	createMaskingTools,
	redactSensitive,
} from './masking'
import { PROVIDERS_BY_KEY, detectProvider } from './providers'
import { type Skill, buildSkillInstructions, createSkillTools } from './skills'
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
	/** Language the agent uses to reply. 'auto' = mirror the user's task language. */
	responseLanguage?: 'auto' | ExtensionLanguage
	includeInitialTab?: boolean
	experimentalIncludeAllTabs?: boolean
	/** Locally-stored saved data / masking entries. Extension-only; not core. */
	maskingEntries?: MaskingEntry[]
	/** Reusable Teach → Skills definitions. Extension-only; not core. */
	skills?: Skill[]
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

		// Resolve response-language directive. 'auto' (or unset) means the agent
		// should mirror the language of the user's task.
		const responseLanguage = config.responseLanguage ?? 'auto'
		const directive =
			responseLanguage === 'auto'
				? 'Match the language of the user'
				: (LANGUAGE_NAMES[responseLanguage] ?? 'English')

		// Strip extension-only fields so they don't reach the core.
		const { responseLanguage: _ignored, maskingEntries, skills, ...restConfig } = config

		// Restricted providers (e.g. the Navvy Demo proxy) reject any tool not in
		// the canonical set, so skills (which add new tool names) are gated on this.
		const provider = PROVIDERS_BY_KEY[detectProvider(config.baseURL)]
		const restrictedToolset = provider?.restrictsSystemPrompt === true

		// Compose engine seams (do this once here; later phases extend it):
		// - customTools: tab tools + masking tool overrides + skill tools
		// - transformPageContent: redact sensitive values outbound
		// - instructions.getPageInstructions: advertise masking tokens + matching skills
		const masking = activeEntries(maskingEntries ?? [])
		const maskingActive = masking.length > 0

		// Skills add brand-new tool names; skip entirely on restricted providers.
		const skillsList = restrictedToolset ? [] : (skills ?? [])
		const skillTools = createSkillTools(skillsList)

		const customTools = {
			...createTabTools(tabsController),
			...(maskingActive ? createMaskingTools(masking) : {}),
			...skillTools,
		}

		const incomingTransform = restConfig.transformPageContent
		const transformPageContent = maskingActive
			? async (content: string) => {
					const base = incomingTransform ? await incomingTransform(content) : content
					return redactSensitive(base, masking)
				}
			: incomingTransform

		const maskingBlock = maskingActive ? buildMaskingInstructions(masking) : undefined
		const incomingInstructions = restConfig.instructions
		const composeInstructions = maskingBlock || skillsList.length > 0
		const instructions = composeInstructions
			? {
					system: incomingInstructions?.system,
					getPageInstructions: (url: string) => {
						const prev = incomingInstructions?.getPageInstructions?.(url)
						const skillBlock = buildSkillInstructions(skillsList, url)
						return [prev, maskingBlock, skillBlock].filter(Boolean).join('\n\n')
					},
				}
			: incomingInstructions
		const systemPrompt = SYSTEM_PROMPT.replace(
			/Default working language: \*\*.*?\*\*/,
			`Default working language: **${directive}**`
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
			restrictedToolset,
			transformPageContent,
			instructions,
			// When masking is active, drop execute_javascript — it can bypass the
			// data-masking mechanism. Otherwise keep the incoming setting.
			experimentalScriptExecutionTool: maskingActive
				? false
				: restConfig.experimentalScriptExecutionTool,

			onBeforeTask: async (agent) => {
				await tabsController.init(agent.task, {
					includeInitialTab,
					experimentalIncludeAllTabs,
					llm: agent.llm,
				})

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
