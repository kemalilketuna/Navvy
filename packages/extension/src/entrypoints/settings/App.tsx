import {
	House,
	Info,
	Keyboard,
	Loader2,
	Mic,
	Settings as SettingsIcon,
	Shield,
	SlidersHorizontal,
	Sparkles,
	X,
	Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { type ExtConfig, loadConfig, saveConfig } from '@/agent/configStore'
import { normalizeEntries } from '@/agent/masking'
import { isProviderConfigComplete, resolveBaseURL } from '@/agent/providers'
import { isVoiceConfigComplete } from '@/agent/voiceProviders'
import { AboutSection } from '@/components/settings/AboutSection'
import { AdvancedSection } from '@/components/settings/AdvancedSection'
import { GeneralSection } from '@/components/settings/GeneralSection'
import { MaskingSection } from '@/components/settings/MaskingSection'
import { ProvidersSection } from '@/components/settings/ProvidersSection'
import { ShortcutsSection } from '@/components/settings/ShortcutsSection'
import { SkillsSection } from '@/components/settings/SkillsSection'
import { VoiceSection } from '@/components/settings/VoiceSection'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/lib/i18n'

type TabKey =
	| 'general'
	| 'providers'
	| 'masking'
	| 'voice'
	| 'shortcuts'
	| 'skills'
	| 'advanced'
	| 'about'

const VALID_TABS: TabKey[] = [
	'general',
	'providers',
	'masking',
	'voice',
	'shortcuts',
	'skills',
	'advanced',
	'about',
]

function readHashTab(): TabKey {
	const raw = window.location.hash.replace(/^#/, '')
	return (VALID_TABS as string[]).includes(raw) ? (raw as TabKey) : 'general'
}

export default function App() {
	const t = useT()
	const [config, setConfig] = useState<ExtConfig | null>(null)
	const [draft, setDraft] = useState<ExtConfig | null>(null)
	const [tab, setTab] = useState<TabKey>(readHashTab)
	const [saving, setSaving] = useState(false)
	const [savedAt, setSavedAt] = useState<number | null>(null)
	const [showMaskingErrors, setShowMaskingErrors] = useState(false)

	useEffect(() => {
		loadConfig().then((c) => {
			setConfig(c)
			setDraft(c)
		})
	}, [])

	useEffect(() => {
		const onHash = () => setTab(readHashTab())
		window.addEventListener('hashchange', onHash)
		return () => window.removeEventListener('hashchange', onHash)
	}, [])

	const handleTabChange = (value: string) => {
		const next = (VALID_TABS as string[]).includes(value) ? (value as TabKey) : 'general'
		setTab(next)
		if (window.location.hash !== `#${next}`) {
			window.history.replaceState(null, '', `#${next}`)
		}
	}

	const dirty = useMemo(() => {
		if (!config || !draft) return false
		return JSON.stringify(config) !== JSON.stringify(draft)
	}, [config, draft])

	const providerConfigComplete = useMemo(() => {
		if (!draft) return true
		return isProviderConfigComplete(draft)
	}, [draft])

	const voiceConfigComplete = useMemo(() => {
		if (!draft) return true
		return isVoiceConfigComplete(draft.voiceConfig, {
			baseURL: resolveBaseURL(draft),
			apiKey: draft.apiKey,
		})
	}, [draft])

	const maskingComplete = useMemo(() => {
		if (!draft) return true
		return normalizeEntries(draft.maskingEntries).valid
	}, [draft])

	useEffect(() => {
		if (maskingComplete) setShowMaskingErrors(false)
	}, [maskingComplete])

	if (!draft) {
		return (
			<div className="flex h-screen items-center justify-center text-muted-foreground">
				<Loader2 className="size-5 animate-spin" />
			</div>
		)
	}

	const patch = (p: Partial<ExtConfig>) => setDraft((prev) => (prev ? { ...prev, ...p } : prev))

	const handleSave = async () => {
		if (!draft || saving) return
		const { entries: maskingEntries, valid } = normalizeEntries(draft.maskingEntries)
		if (!valid) {
			setShowMaskingErrors(true)
			handleTabChange('masking')
			return
		}
		const next = { ...draft, maskingEntries }
		setSaving(true)
		try {
			const saved = await saveConfig(next)
			setConfig(saved)
			setDraft(saved)
			setSavedAt(Date.now())
			setTimeout(() => setSavedAt(null), 2000)
		} finally {
			setSaving(false)
		}
	}

	const handleReset = () => {
		if (config) setDraft(config)
	}

	const handleClose = async () => {
		try {
			const stored = await chrome.storage.session.get('settingsReturnTabId')
			let tabId = stored.settingsReturnTabId as number | undefined

			if (tabId != null) {
				try {
					await chrome.tabs.get(tabId)
				} catch {
					tabId = undefined
				}
			}

			if (tabId == null) {
				const tabs = await chrome.tabs.query({ currentWindow: true })
				const settingsUrl = chrome.runtime.getURL('settings.html')
				const fallback = tabs.find((tab) => tab.id != null && tab.url !== settingsUrl)
				tabId = fallback?.id ?? undefined
			}

			if (tabId != null) {
				await chrome.tabs.update(tabId, { active: true })
				try {
					await chrome.sidePanel.open({ tabId })
				} catch (err) {
					console.warn('[Settings] sidePanel.open failed:', err)
				}
			}

			await chrome.storage.session.remove('settingsReturnTabId')

			const current = await chrome.tabs.getCurrent()
			if (current?.id != null) {
				await chrome.tabs.remove(current.id)
			} else {
				window.close()
			}
		} catch (err) {
			console.error('[Settings] Failed to close:', err)
			window.close()
		}
	}

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<header className="shrink-0 border-b border-border">
				<div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
					<SettingsIcon className="size-5 text-muted-foreground" />
					<h1 className="text-xl font-semibold">{t('ext.config.title')}</h1>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleClose}
						className="ml-auto cursor-pointer text-muted-foreground hover:text-foreground"
						aria-label={t('ext.settings.close')}
						title={t('ext.settings.close')}
					>
						<X className="size-4" />
					</Button>
				</div>
			</header>

			<Tabs
				orientation="vertical"
				value={tab}
				onValueChange={handleTabChange}
				className="mx-auto min-h-0 w-full max-w-5xl flex-1 gap-8 px-6"
			>
				<TabsList className="w-56 shrink-0 self-start py-8">
					<TabsTrigger value="general">
						<House />
						<span>{t('ext.settings.tabGeneral')}</span>
					</TabsTrigger>
					<TabsTrigger value="providers">
						<Zap />
						<span>{t('ext.settings.tabProviders')}</span>
					</TabsTrigger>
					<TabsTrigger value="masking">
						<Shield />
						<span>{t('ext.settings.tabMasking')}</span>
					</TabsTrigger>
					<TabsTrigger value="voice">
						<Mic />
						<span>{t('ext.settings.tabVoice')}</span>
					</TabsTrigger>
					<TabsTrigger value="shortcuts">
						<Keyboard />
						<span>{t('ext.settings.tabShortcuts')}</span>
					</TabsTrigger>
					<TabsTrigger value="skills">
						<Sparkles />
						<span>{t('ext.settings.tabSkills')}</span>
					</TabsTrigger>
					<TabsTrigger value="advanced">
						<SlidersHorizontal />
						<span>{t('ext.settings.tabAdvanced')}</span>
					</TabsTrigger>
					<TabsTrigger value="about">
						<Info />
						<span>{t('ext.settings.tabAbout')}</span>
					</TabsTrigger>
				</TabsList>

				<div className="min-w-0 flex-1 overflow-y-auto py-8">
					<TabsContent value="general">
						<GeneralSection
							language={draft.language}
							responseLanguage={draft.responseLanguage}
							onLanguageChange={(language) => patch({ language })}
							onResponseLanguageChange={(responseLanguage) => patch({ responseLanguage })}
						/>
					</TabsContent>
					<TabsContent value="providers">
						<ProvidersSection config={draft} onChange={(c) => patch(c)} />
					</TabsContent>
					<TabsContent value="masking">
						<MaskingSection
							entries={draft.maskingEntries}
							onChange={(maskingEntries) => patch({ maskingEntries })}
							showErrors={showMaskingErrors}
						/>
					</TabsContent>
					<TabsContent value="voice">
						<VoiceSection
							value={draft.voiceConfig}
							onChange={(voiceConfig) => patch({ voiceConfig })}
							llm={{ baseURL: resolveBaseURL(draft), apiKey: draft.apiKey }}
						/>
					</TabsContent>
					<TabsContent value="shortcuts">
						<ShortcutsSection
							value={draft.shortcutsConfig}
							onChange={(shortcutsConfig) => patch({ shortcutsConfig })}
						/>
					</TabsContent>
					<TabsContent value="skills">
						<SkillsSection
							skills={draft.skills}
							onChange={(skills) => patch({ skills })}
							llm={{
								baseURL: resolveBaseURL(draft),
								model: draft.model,
								apiKey: draft.apiKey,
								disableNamedToolChoice: draft.disableNamedToolChoice,
							}}
						/>
					</TabsContent>
					<TabsContent value="advanced">
						<AdvancedSection
							value={{
								maxSteps: draft.maxSteps,
								systemInstruction: draft.systemInstruction,
								experimentalLlmsTxt: draft.experimentalLlmsTxt,
								experimentalIncludeAllTabs: draft.experimentalIncludeAllTabs,
								disableNamedToolChoice: draft.disableNamedToolChoice,
							}}
							onChange={(p) => patch(p)}
						/>
					</TabsContent>
					<TabsContent value="about">
						<AboutSection />
					</TabsContent>
				</div>
			</Tabs>

			{dirty && (
				<div className="shrink-0 border-t border-border bg-background/95 backdrop-blur">
					<div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
						<span className="text-sm text-muted-foreground">
							{savedAt
								? t('ext.settings.savedNotice')
								: showMaskingErrors && !maskingComplete
									? t('ext.masking.incompleteNotice')
									: !voiceConfigComplete
										? t('ext.voice.missingKey')
										: t('ext.settings.unsavedNotice')}
						</span>
						<div className="flex gap-2">
							<Button variant="outline" onClick={handleReset} disabled={saving}>
								{t('ext.config.cancel')}
							</Button>
							<Button
								onClick={handleSave}
								disabled={saving || !providerConfigComplete || !voiceConfigComplete}
							>
								{saving ? <Loader2 className="size-4 animate-spin" /> : t('ext.config.save')}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
