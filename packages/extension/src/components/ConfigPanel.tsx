import {
	Copy,
	CornerUpLeft,
	ExternalLink,
	Eye,
	EyeOff,
	FoldVertical,
	HatGlasses,
	Home,
	Loader2,
	Plus,
	Scale,
	Trash2,
	UnfoldVertical,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { siGithub } from 'simple-icons'

import { DEMO_BASE_URL, DEMO_MODEL, isTestingEndpoint } from '@/agent/constants'
import { PROVIDERS, PROVIDERS_BY_KEY, type ProviderKey } from '@/agent/providers'
import type { ExtConfig, LLMProfile, LanguagePreference } from '@/agent/useAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/lib/i18n'

interface ConfigPanelProps {
	config: ExtConfig | null
	onSave: (config: ExtConfig) => Promise<void>
	onClose: () => void
}

function newProfileId(): string {
	return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function ConfigPanel({ config, onSave, onClose }: ConfigPanelProps) {
	const t = useT()
	const [profiles, setProfiles] = useState<LLMProfile[]>(config?.profiles ?? [])
	const [activeProfileId, setActiveProfileId] = useState<string>(config?.activeProfileId ?? '')
	const [language, setLanguage] = useState<LanguagePreference>(config?.language)
	const [maxSteps, setMaxSteps] = useState(config?.maxSteps)
	const [systemInstruction, setSystemInstruction] = useState(config?.systemInstruction ?? '')
	const [experimentalLlmsTxt, setExperimentalLlmsTxt] = useState(
		config?.experimentalLlmsTxt ?? false
	)
	const [experimentalIncludeAllTabs, setExperimentalIncludeAllTabs] = useState(
		config?.experimentalIncludeAllTabs ?? false
	)
	const [disableNamedToolChoice, setDisableNamedToolChoice] = useState(
		config?.disableNamedToolChoice ?? false
	)
	const [advancedOpen, setAdvancedOpen] = useState(false)
	const [saving, setSaving] = useState(false)
	const [userAuthToken, setUserAuthToken] = useState('')
	const [copied, setCopied] = useState(false)
	const [showToken, setShowToken] = useState(false)
	const [showApiKey, setShowApiKey] = useState(false)

	const [prevConfig, setPrevConfig] = useState(config)
	if (prevConfig !== config) {
		setPrevConfig(config)
		setProfiles(config?.profiles ?? [])
		setActiveProfileId(config?.activeProfileId ?? '')
		setLanguage(config?.language)
		setMaxSteps(config?.maxSteps)
		setSystemInstruction(config?.systemInstruction ?? '')
		setExperimentalLlmsTxt(config?.experimentalLlmsTxt ?? false)
		setExperimentalIncludeAllTabs(config?.experimentalIncludeAllTabs ?? false)
		setDisableNamedToolChoice(config?.disableNamedToolChoice ?? false)
	}

	const activeProfile = useMemo(
		() => profiles.find((p) => p.id === activeProfileId) ?? profiles[0],
		[profiles, activeProfileId]
	)

	const updateActiveProfile = (patch: Partial<LLMProfile>) => {
		setProfiles((prev) => prev.map((p) => (p.id === activeProfileId ? { ...p, ...patch } : p)))
	}

	const handleProviderChange = (key: ProviderKey) => {
		if (!activeProfile) return
		if (key === 'custom') {
			updateActiveProfile({ providerKey: 'custom' })
			return
		}
		const preset = PROVIDERS_BY_KEY[key]
		updateActiveProfile({
			providerKey: key,
			baseURL: preset.baseURL,
			model: preset.defaultModel,
		})
	}

	const handleAddProfile = () => {
		const id = newProfileId()
		const preset = PROVIDERS_BY_KEY.openai
		const next: LLMProfile = {
			id,
			name: t('ext.config.profileNewName'),
			providerKey: 'openai',
			baseURL: preset.baseURL,
			model: preset.defaultModel,
			apiKey: '',
		}
		setProfiles((prev) => [...prev, next])
		setActiveProfileId(id)
	}

	const handleDeleteProfile = () => {
		if (profiles.length <= 1) return
		const idx = profiles.findIndex((p) => p.id === activeProfileId)
		const next = profiles.filter((p) => p.id !== activeProfileId)
		setProfiles(next)
		const fallback = next[Math.max(0, idx - 1)]
		setActiveProfileId(fallback.id)
	}

	// Poll for user auth token every second until found
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null

		const fetchToken = async () => {
			const result = await chrome.storage.local.get('PageAgentExtUserAuthToken')
			const token = result.PageAgentExtUserAuthToken
			if (typeof token === 'string' && token) {
				setUserAuthToken(token)
				if (interval) {
					clearInterval(interval)
					interval = null
				}
			}
		}

		fetchToken()
		interval = setInterval(fetchToken, 1000)

		return () => {
			if (interval) clearInterval(interval)
		}
	}, [])

	const handleCopyToken = async () => {
		if (userAuthToken) {
			await navigator.clipboard.writeText(userAuthToken)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	const handleSave = async () => {
		if (!activeProfile) return
		setSaving(true)
		try {
			await onSave({
				apiKey: activeProfile.apiKey,
				baseURL: activeProfile.baseURL,
				model: activeProfile.model,
				language,
				maxSteps: maxSteps || undefined,
				systemInstruction: systemInstruction || undefined,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				disableNamedToolChoice,
				profiles,
				activeProfileId: activeProfile.id,
			})
		} finally {
			setSaving(false)
		}
	}

	const currentPreset = activeProfile ? PROVIDERS_BY_KEY[activeProfile.providerKey] : undefined

	return (
		<div className="flex flex-col gap-4 p-4 relative">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold">{t('ext.config.title')}</h2>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					className="absolute top-2 right-3 cursor-pointer"
					aria-label={t('ext.header.back')}
				>
					<CornerUpLeft className="size-3.5" />
				</Button>
			</div>

			{/* User Auth Token Section */}
			<div className="flex flex-col gap-1.5 p-3 bg-muted/50 rounded-md border">
				<label htmlFor="user-auth-token" className="text-xs font-medium text-muted-foreground">
					{t('ext.config.userAuthToken')}
				</label>
				<p className="text-[10px] text-muted-foreground mb-1">
					{t('ext.config.userAuthTokenHelp')}
				</p>
				<div className="flex gap-2 items-center">
					<Input
						id="user-auth-token"
						readOnly
						value={
							userAuthToken
								? showToken
									? userAuthToken
									: `${userAuthToken.slice(0, 4)}${'•'.repeat(userAuthToken.length - 8)}${userAuthToken.slice(-4)}`
								: t('ext.config.loading')
						}
						className="text-xs h-8 font-mono bg-background"
					/>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 cursor-pointer"
						onClick={() => setShowToken(!showToken)}
						disabled={!userAuthToken}
						aria-label={showToken ? t('ext.config.hideToken') : t('ext.config.showToken')}
						aria-pressed={showToken}
					>
						{showToken ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 cursor-pointer"
						onClick={handleCopyToken}
						disabled={!userAuthToken}
						aria-label={t('ext.config.copyToken')}
					>
						{copied ? <span className="">✓</span> : <Copy className="size-3" />}
					</Button>
					<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
						{copied ? t('ext.config.tokenCopied') : ''}
					</span>
				</div>
			</div>

			{/* Hub link */}
			<a
				href="/hub.html"
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center justify-between p-3 rounded-md border bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
			>
				{t('ext.config.manageHub')}
				<ExternalLink className="size-3" />
			</a>

			{/* Profile selector */}
			{activeProfile && (
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-muted-foreground">{t('ext.config.profile')}</label>
					<div className="flex gap-2 items-center">
						<select
							value={activeProfile.id}
							onChange={(e) => setActiveProfileId(e.target.value)}
							className="h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer flex-1 min-w-0"
						>
							{profiles.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name || t('ext.config.profileUnnamed')}
								</option>
							))}
						</select>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8 shrink-0 cursor-pointer"
							onClick={handleAddProfile}
							aria-label={t('ext.config.profileAdd')}
							title={t('ext.config.profileAdd')}
						>
							<Plus className="size-3" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8 shrink-0 cursor-pointer"
							onClick={handleDeleteProfile}
							disabled={profiles.length <= 1}
							aria-label={t('ext.config.profileDelete')}
							title={t('ext.config.profileDelete')}
						>
							<Trash2 className="size-3" />
						</Button>
					</div>
					<Input
						id="profile-name"
						placeholder={t('ext.config.profileNamePlaceholder')}
						value={activeProfile.name}
						onChange={(e) => updateActiveProfile({ name: e.target.value })}
						className="text-xs h-8"
					/>
				</div>
			)}

			{/* Provider preset */}
			{activeProfile && (
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-muted-foreground">{t('ext.config.provider')}</label>
					<select
						value={activeProfile.providerKey}
						onChange={(e) => handleProviderChange(e.target.value as ProviderKey)}
						className="h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
					>
						{PROVIDERS.map((p) => (
							<option key={p.key} value={p.key}>
								{p.label}
							</option>
						))}
					</select>
					{currentPreset?.apiKeyURL && (
						<a
							href={currentPreset.apiKeyURL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
						>
							{t('ext.config.getApiKey')}
							<ExternalLink className="size-2.5" />
						</a>
					)}
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<label htmlFor="base-url" className="text-xs text-muted-foreground">
					{t('ext.config.baseUrl')}
				</label>
				<Input
					id="base-url"
					placeholder="https://api.openai.com/v1"
					value={activeProfile?.baseURL ?? DEMO_BASE_URL}
					onChange={(e) => updateActiveProfile({ baseURL: e.target.value, providerKey: 'custom' })}
					className="text-xs h-8"
				/>
			</div>

			{/* Testing API notice */}
			{activeProfile && isTestingEndpoint(activeProfile.baseURL) && (
				<div className="p-2.5 rounded-md border border-amber-500/30 bg-amber-500/5 text-[11px] text-muted-foreground leading-relaxed">
					<Scale className="size-3 inline-block mr-1 -mt-0.5 text-amber-600" />
					{t('ext.config.testingApiNotice')}{' '}
					<a
						href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-foreground"
					>
						{t('ext.config.termsAndPrivacy')}
					</a>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<label htmlFor="model" className="text-xs text-muted-foreground">
					{t('ext.config.model')}
				</label>
				<Input
					id="model"
					placeholder={currentPreset?.defaultModel || DEMO_MODEL}
					value={activeProfile?.model ?? ''}
					onChange={(e) => updateActiveProfile({ model: e.target.value })}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="api-key" className="text-xs text-muted-foreground">
					{t('ext.config.apiKey')}
				</label>
				<div className="flex gap-2 items-center">
					<Input
						id="api-key"
						type={showApiKey ? 'text' : 'password'}
						value={activeProfile?.apiKey ?? ''}
						onChange={(e) => updateActiveProfile({ apiKey: e.target.value })}
						className="text-xs h-8"
					/>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 cursor-pointer"
						onClick={() => setShowApiKey(!showApiKey)}
						aria-label={showApiKey ? t('ext.config.hideApiKey') : t('ext.config.showApiKey')}
					>
						{showApiKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">{t('ext.config.responseLanguage')}</label>
				<select
					value={language ?? ''}
					onChange={(e) => setLanguage((e.target.value || undefined) as LanguagePreference)}
					className="h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
				>
					<option value="">{t('ext.config.languageSystem')}</option>
					<option value="en-US">English</option>
					<option value="fr-FR">Français</option>
					<option value="de-DE">Deutsch</option>
					<option value="es-ES">Español</option>
					<option value="it-IT">Italiano</option>
					<option value="pt-PT">Português</option>
					<option value="tr-TR">Türkçe</option>
				</select>
			</div>

			{/* Advanced Config */}
			<button
				type="button"
				onClick={() => setAdvancedOpen(!advancedOpen)}
				className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mt-1 font-bold"
			>
				{t('ext.config.advanced')}
				{advancedOpen ? <FoldVertical className="size-3" /> : <UnfoldVertical className="size-3" />}
			</button>

			{advancedOpen && (
				<>
					<div className="flex flex-col gap-1.5">
						<label htmlFor="max-steps" className="text-xs text-muted-foreground">
							{t('ext.config.maxSteps')}
						</label>
						<Input
							id="max-steps"
							type="number"
							placeholder="40"
							min={1}
							max={200}
							value={maxSteps ?? ''}
							onChange={(e) => setMaxSteps(e.target.value ? Number(e.target.value) : undefined)}
							className="text-xs h-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs text-muted-foreground">
							{t('ext.config.systemInstruction')}
						</label>
						<textarea
							placeholder={t('ext.config.systemInstructionPlaceholder')}
							value={systemInstruction}
							onChange={(e) => setSystemInstruction(e.target.value)}
							rows={3}
							className="text-xs rounded-md border border-input bg-background px-3 py-2 resize-y min-h-[60px]"
						/>
					</div>

					<label className="flex items-center justify-between cursor-pointer">
						<span className="text-xs text-muted-foreground">
							{t('ext.config.disableNamedToolChoice')}
						</span>
						<Switch checked={disableNamedToolChoice} onCheckedChange={setDisableNamedToolChoice} />
					</label>

					<label className="flex items-center justify-between cursor-pointer">
						<span className="text-xs text-muted-foreground">{t('ext.config.expLlmsTxt')}</span>
						<Switch checked={experimentalLlmsTxt} onCheckedChange={setExperimentalLlmsTxt} />
					</label>

					<label className="flex items-center justify-between cursor-pointer">
						<span className="text-xs text-muted-foreground">
							{t('ext.config.expIncludeAllTabs')}
						</span>
						<Switch
							checked={experimentalIncludeAllTabs}
							onCheckedChange={setExperimentalIncludeAllTabs}
						/>
					</label>
				</>
			)}

			<div className="flex gap-2 mt-2">
				<Button variant="outline" onClick={onClose} className="flex-1 h-8 text-xs cursor-pointer">
					{t('ext.config.cancel')}
				</Button>
				<Button
					onClick={handleSave}
					disabled={saving}
					className="flex-1 h-8 text-xs cursor-pointer"
				>
					{saving ? <Loader2 className="size-3 animate-spin" /> : t('ext.config.save')}
				</Button>
			</div>

			{/* Footer */}
			<div className="mt-4 mb-4 pt-4 border-t border-border/50 flex gap-2 justify-between text-[10px] text-muted-foreground">
				<div className="flex flex-col justify-between">
					<span>
						{t('ext.config.version')} <span className="font-mono">v{__VERSION__}</span>
					</span>

					<a
						href="https://github.com/alibaba/page-agent"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-foreground"
					>
						<svg role="img" viewBox="0 0 24 24" className="size-3 fill-current">
							<path d={siGithub.path} />
						</svg>
						<span>{t('ext.config.sourceCode')}</span>
					</a>
				</div>

				<div className="flex flex-col items-end">
					<a
						href="https://alibaba.github.io/page-agent/"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-foreground"
					>
						<Home className="size-3" />
						<span>{t('ext.config.homePage')}</span>
					</a>

					<a
						href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-foreground"
					>
						<HatGlasses className="size-3" />
						<span>{t('ext.config.privacy')}</span>
					</a>
				</div>
			</div>
		</div>
	)
}
