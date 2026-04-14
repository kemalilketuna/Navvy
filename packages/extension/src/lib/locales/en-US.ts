/**
 * English — source of truth. The shape of this object defines `TranslationSchema`
 * and `TranslationKey`. All other locales conform to this shape.
 */
export const enUS = {
	ext: {
		status: {
			ready: 'Ready',
			running: 'Running',
			completed: 'Done',
			error: 'Error',
			stopped: 'Stopped',
		},
		header: {
			history: 'History',
			settings: 'Settings',
			back: 'Back',
			newChat: 'New chat',
			menu: 'Menu',
		},
		menu: {
			skills: 'Skills',
			settings: 'Settings',
		},
		skills: {
			title: 'Skills',
			comingSoon: 'Coming soon',
			description: 'Reusable agent skills will live here.',
		},
		empty: {
			tip1: 'Enter a task to automate this page',
			tip2: 'Execute multi-page tasks',
			tip3: 'Call this extension from your web page',
			tip4: 'Use this extension in your own agents',
			github: 'GitHub',
			docs: 'Documentation',
			website: 'Website',
		},
		task: {
			label: 'Task',
		},
		input: {
			placeholder: 'Describe your task... (Enter to send)',
			send: 'Send',
			stop: 'Stop task',
		},
		history: {
			title: 'History',
			clearAll: 'Clear All',
			noHistory: 'No history yet',
			loading: 'Loading...',
			justNow: 'just now',
			minutesAgo: '{{n}}m ago',
			hoursAgo: '{{n}}h ago',
			daysAgo: '{{n}}d ago',
			stepsCount: '{{n}} steps',
			runAgain: 'Run again',
			runAgainTitle: 'Run task again',
			exportTitle: 'Export history JSON',
			deleteTitle: 'Delete history',
			delete: 'Delete',
		},
		config: {
			title: 'Settings',
			userAuthToken: 'User Auth Token',
			userAuthTokenHelp: 'Give a website the ability to call this extension.',
			loading: 'Loading...',
			showToken: 'Show token',
			hideToken: 'Hide token',
			copyToken: 'Copy token',
			tokenCopied: 'Token copied',
			manageHub: 'Manage Navvy Hub',
			profile: 'Profile',
			profileAdd: 'Add profile',
			profileDelete: 'Delete profile',
			profileNewName: 'New profile',
			profileUnnamed: 'Unnamed',
			profileNamePlaceholder: 'Profile name',
			provider: 'Provider',
			getApiKey: 'Get an API key',
			baseUrl: 'Base URL',
			model: 'Model',
			apiKey: 'API Key',
			showApiKey: 'Show API key',
			hideApiKey: 'Hide API key',
			responseLanguage: 'Response Language',
			languageSystem: 'System',
			advanced: 'Advanced',
			maxSteps: 'Max Steps',
			systemInstruction: 'System Instruction',
			systemInstructionPlaceholder: 'Additional instructions for the agent...',
			disableNamedToolChoice: 'Disable named tool_choice',
			expLlmsTxt: 'Experimental llms.txt support',
			expIncludeAllTabs: 'Experimental include all tabs',
			cancel: 'Cancel',
			save: 'Save',
			version: 'Version',
			sourceCode: 'Source Code',
			homePage: 'Home Page',
			privacy: 'Privacy',
			testingApiNotice: 'You are using our testing API. By using this you agree to the',
			termsAndPrivacy: 'Terms of Use & Privacy Policy',
		},
		settings: {
			tabGeneral: 'General',
			tabProviders: 'Providers',
			tabSkills: 'Skills',
			tabAdvanced: 'Advanced',
			tabAbout: 'About',
			languageHelp: 'Language the agent uses when responding to you.',
			unsavedNotice: 'You have unsaved changes',
			savedNotice: 'Saved',
		},
		error: {
			title: 'Something went wrong',
			unexpected: 'An unexpected error occurred',
			resetConfig: 'Reset Config',
			reloadPanel: 'Reload Panel',
		},
		cards: {
			resultLabel: 'Result',
			resultSuccess: 'Success',
			resultFailed: 'Failed',
			step: 'Step',
			actions: 'Actions',
			rawRequest: 'Raw Request',
			rawResponse: 'Raw Response',
			copy: 'Copy',
			copied: 'Copied!',
			copySystem: 'Copy System',
			copyUser: 'Copy User',
		},
		activity: {
			thinking: 'Thinking...',
			executing: 'Executing {{tool}}...',
			done: 'Done: {{tool}}',
			retrying: 'Retrying ({{attempt}}/{{max}})...',
		},
		hub: {
			name: 'Navvy Hub',
			beta: 'Beta',
			intro:
				'Navvy Hub lets local apps (e.g. MCP servers) control the Navvy extension via WebSocket.',
			checkOutOfficial: 'Check out the official',
			mcpServerPackage: 'MCP server package',
			configHeading: 'Config',
			autoApprove: 'Auto-approve connections',
			autoApproveHelp1: 'By default, each connection requires your approval before running tasks.',
			autoApproveHelp2: 'Enable this to skip per-session approval.',
			autoApproveCaution: '* Use with caution!',
			docsHeading: 'Docs',
			connectVia: 'Connect via',
			flowHeading: 'Flow',
			callerToHub: 'Caller → Hub',
			hubToCaller: 'Hub → Caller',
			connected: 'Connected',
			connecting: 'Connecting…',
			disconnected: 'Disconnected',
			noConnection: 'No connection',
			waitingForTask: 'Waiting for task from external caller…',
			noActiveSession: 'No active session',
			currentTask: 'Current Task',
			stop: 'Stop',
		},
	},
} as const

type DeepStringify<T> = {
	[K in keyof T]: T[K] extends string ? string : T[K] extends object ? DeepStringify<T[K]> : T[K]
}

export type TranslationSchema = DeepStringify<typeof enUS>

type NestedKeyOf<O extends object> = {
	[K in keyof O & (string | number)]: O[K] extends object
		? `${K}` | `${K}.${NestedKeyOf<O[K]>}`
		: `${K}`
}[keyof O & (string | number)]

export type TranslationKey = NestedKeyOf<TranslationSchema>
