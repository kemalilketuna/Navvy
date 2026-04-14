import {
	Info,
	Loader2,
	Settings as SettingsIcon,
	SlidersHorizontal,
	Sparkles,
	Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { type ExtConfig, loadConfig, saveConfig } from '@/agent/configStore'
import type { LLMProfile } from '@/agent/profiles'
import { AboutSection } from '@/components/settings/AboutSection'
import { AdvancedSection } from '@/components/settings/AdvancedSection'
import { GeneralSection } from '@/components/settings/GeneralSection'
import { ProvidersSection } from '@/components/settings/ProvidersSection'
import { SkillsSection } from '@/components/settings/SkillsSection'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/lib/i18n'

type TabKey = 'general' | 'providers' | 'skills' | 'advanced' | 'about'

const VALID_TABS: TabKey[] = ['general', 'providers', 'skills', 'advanced', 'about']

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
		setSaving(true)
		try {
			const saved = await saveConfig(draft)
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

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
				<header className="flex items-center gap-3">
					<SettingsIcon className="size-5 text-muted-foreground" />
					<h1 className="text-xl font-semibold">{t('ext.config.title')}</h1>
				</header>

				<Tabs orientation="vertical" value={tab} onValueChange={handleTabChange} className="gap-8">
					<TabsList className="w-56 shrink-0 self-start sticky top-8">
						<TabsTrigger value="general">
							<SettingsIcon />
							<span>{t('ext.settings.tabGeneral')}</span>
						</TabsTrigger>
						<TabsTrigger value="providers">
							<Zap />
							<span>{t('ext.settings.tabProviders')}</span>
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

					<div className="min-w-0 flex-1 pb-24">
						<TabsContent value="general">
							<GeneralSection
								language={draft.language}
								responseLanguage={draft.responseLanguage}
								onLanguageChange={(language) => patch({ language })}
								onResponseLanguageChange={(responseLanguage) => patch({ responseLanguage })}
							/>
						</TabsContent>
						<TabsContent value="providers">
							<ProvidersSection
								profiles={draft.profiles}
								activeProfileId={draft.activeProfileId}
								onProfilesChange={(profiles: LLMProfile[]) => patch({ profiles })}
								onActiveProfileChange={(activeProfileId) => patch({ activeProfileId })}
							/>
						</TabsContent>
						<TabsContent value="skills">
							<SkillsSection />
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
			</div>

			{dirty && (
				<div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur">
					<div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
						<span className="text-sm text-muted-foreground">
							{savedAt ? t('ext.settings.savedNotice') : t('ext.settings.unsavedNotice')}
						</span>
						<div className="flex gap-2">
							<Button variant="outline" onClick={handleReset} disabled={saving}>
								{t('ext.config.cancel')}
							</Button>
							<Button onClick={handleSave} disabled={saving}>
								{saving ? <Loader2 className="size-4 animate-spin" /> : t('ext.config.save')}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
