import {
	CheckCircle2,
	ExternalLink,
	Eye,
	EyeOff,
	Loader2,
	Plus,
	Scale,
	Trash2,
	XCircle,
} from 'lucide-react'
import { useState } from 'react'

import { DEMO_BASE_URL, DEMO_MODEL, isTestingEndpoint } from '@/agent/constants'
import { type LLMProfile, type ProviderCredentials, newProfileId } from '@/agent/profiles'
import { PROVIDERS, PROVIDERS_BY_KEY, type ProviderKey } from '@/agent/providers'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useT } from '@/lib/i18n'

/**
 * Newer OpenAI models (GPT-5 family, o-series reasoning models) reject the legacy
 * `max_tokens` parameter with a 400 and require `max_completion_tokens` instead, while
 * most other OpenAI-compatible providers only understand `max_tokens`. Pick the right
 * key per model so the connectivity test works everywhere.
 * https://developers.openai.com/api/docs/deprecations
 */
function tokenLimitBody(model: string): Record<string, number> {
	const normalized = (model.toLowerCase().split('/').pop() ?? '').replace(/[._]/g, '')
	const requiresCompletionTokens = /^gpt-?5/.test(normalized) || /^o[1-9]/.test(normalized)
	return requiresCompletionTokens ? { max_completion_tokens: 16 } : { max_tokens: 1 }
}

interface ProvidersSectionProps {
	profiles: LLMProfile[]
	activeProfileId: string
	onProfilesChange: (profiles: LLMProfile[]) => void
	onActiveProfileChange: (id: string) => void
}

export function ProvidersSection({
	profiles,
	activeProfileId,
	onProfilesChange,
	onActiveProfileChange,
}: ProvidersSectionProps) {
	const t = useT()
	const [showApiKey, setShowApiKey] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [testState, setTestState] = useState<
		| { status: 'idle' }
		| { status: 'running' }
		| { status: 'success' }
		| { status: 'error'; message: string }
	>({ status: 'idle' })

	const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
	const preset = activeProfile ? PROVIDERS_BY_KEY[activeProfile.providerKey] : undefined

	if (!activeProfile || !preset) return null

	const updateActive = (patch: Partial<LLMProfile>) => {
		onProfilesChange(profiles.map((p) => (p.id === activeProfile.id ? { ...p, ...patch } : p)))
	}

	const handleProviderChange = (key: ProviderKey) => {
		if (key === activeProfile.providerKey) return
		const nextPreset = PROVIDERS_BY_KEY[key]
		const prevKey = activeProfile.providerKey

		const stashedCurrent: ProviderCredentials = {
			apiKey: activeProfile.apiKey,
			accountId: activeProfile.accountId,
			baseURL: activeProfile.baseURL,
			model: activeProfile.model,
		}
		const savedCredentials = {
			...(activeProfile.savedCredentials ?? {}),
			[prevKey]: stashedCurrent,
		}
		const restored = savedCredentials[key]

		updateActive({
			providerKey: key,
			baseURL: restored?.baseURL ?? nextPreset.baseURL,
			model: restored?.model ?? nextPreset.defaultModel,
			apiKey: restored?.apiKey,
			accountId: nextPreset.requiresAccountId ? restored?.accountId : undefined,
			savedCredentials,
		})
	}

	const handleAdd = () => {
		const id = newProfileId()
		const next: LLMProfile = {
			id,
			name: t('ext.config.profileNewName'),
			providerKey: 'openai',
			baseURL: PROVIDERS_BY_KEY.openai.baseURL,
			model: PROVIDERS_BY_KEY.openai.defaultModel,
			apiKey: '',
		}
		onProfilesChange([...profiles, next])
		onActiveProfileChange(id)
	}

	const handleDelete = () => {
		if (profiles.length <= 1) return
		const idx = profiles.findIndex((p) => p.id === activeProfile.id)
		const next = profiles.filter((p) => p.id !== activeProfile.id)
		onProfilesChange(next)
		const fallback = next[Math.max(0, idx - 1)]
		onActiveProfileChange(fallback.id)
		setDeleteOpen(false)
	}

	const handleTestConnection = async () => {
		if (preset.requiresApiKey && !activeProfile.apiKey) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingApiKey') })
			return
		}
		if (preset.requiresAccountId && !activeProfile.accountId) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingAccountId') })
			return
		}
		if (!activeProfile.model) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingModel') })
			return
		}
		const baseURL = preset.buildBaseURL
			? preset.buildBaseURL({ accountId: activeProfile.accountId })
			: (activeProfile.baseURL ?? preset.baseURL)
		if (!baseURL) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingBaseUrl') })
			return
		}

		setTestState({ status: 'running' })
		try {
			const controller = new AbortController()
			const timeout = setTimeout(() => controller.abort(), 15000)
			const res = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(activeProfile.apiKey ? { Authorization: `Bearer ${activeProfile.apiKey}` } : {}),
				},
				body: JSON.stringify({
					model: activeProfile.model,
					messages: [{ role: 'user', content: 'ping' }],
					...tokenLimitBody(activeProfile.model),
				}),
				signal: controller.signal,
			}).finally(() => clearTimeout(timeout))

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				const message =
					(data as { error?: { message?: string } } | null)?.error?.message ||
					`HTTP ${res.status} ${res.statusText}`
				setTestState({ status: 'error', message })
				return
			}
			setTestState({ status: 'success' })
		} catch (err) {
			const message = (err as Error)?.message || 'Network error'
			setTestState({ status: 'error', message })
		}
	}

	const showProfileSelector = profiles.length > 1
	const showBaseURL = preset.baseURLEditable !== false && !preset.buildBaseURL
	const modelOptions: ComboboxOption[] = preset.models.map((m) => ({
		value: m.id,
		label: m.label ?? m.id,
		icon: m.supportsImages ? 'image' : null,
	}))
	const allowCustomModel =
		preset.key === 'custom' || preset.key === 'ollama' || preset.models.length === 0

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			{showProfileSelector && (
				<>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium">{t('ext.config.profile')}</label>
						<div className="flex gap-2 items-center">
							<Select
								className="flex-1 min-w-0"
								value={activeProfile.id}
								onChange={onActiveProfileChange}
								options={profiles.map((p) => ({
									value: p.id,
									label: p.name || t('ext.config.profileUnnamed'),
								}))}
							/>
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9 shrink-0 cursor-pointer"
								onClick={handleAdd}
								aria-label={t('ext.config.profileAdd')}
								title={t('ext.config.profileAdd')}
							>
								<Plus className="size-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9 shrink-0 cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10"
								onClick={() => setDeleteOpen(true)}
								disabled={profiles.length <= 1}
								aria-label={t('ext.config.profileDelete')}
								title={t('ext.config.profileDelete')}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="profile-name" className="text-sm font-medium">
							{t('ext.config.profileName')}
						</label>
						<p className="text-xs text-muted-foreground">{t('ext.config.profileNameHelp')}</p>
						<Input
							id="profile-name"
							placeholder={t('ext.config.profileNamePlaceholder')}
							value={activeProfile.name}
							onChange={(e) => updateActive({ name: e.target.value })}
							className="text-sm h-9 mt-1"
						/>
					</div>

					<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t('ext.config.profileDeleteConfirmTitle')}</AlertDialogTitle>
								<AlertDialogDescription>
									{t('ext.config.profileDeleteConfirmBody', {
										name: activeProfile.name || t('ext.config.profileUnnamed'),
									})}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>{t('ext.config.cancel')}</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete}>
									{t('ext.config.profileDelete')}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			)}

			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.config.provider')}</label>
				<Select
					value={activeProfile.providerKey}
					onChange={(v) => handleProviderChange(v as ProviderKey)}
					options={PROVIDERS.map((p) => ({ value: p.key, label: p.label }))}
				/>
				{preset.apiKeyURL && (
					<a
						href={preset.apiKeyURL}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
					>
						{t('ext.config.getApiKey')}
						<ExternalLink className="size-3" />
					</a>
				)}
			</div>

			{showBaseURL && (
				<div className="flex flex-col gap-1.5">
					<label htmlFor="base-url" className="text-sm font-medium">
						{t('ext.config.baseUrl')}
					</label>
					<Input
						id="base-url"
						placeholder="https://api.openai.com/v1"
						value={activeProfile.baseURL ?? DEMO_BASE_URL}
						onChange={(e) => updateActive({ baseURL: e.target.value, providerKey: 'custom' })}
						className="text-sm h-9"
					/>
				</div>
			)}

			{isTestingEndpoint(activeProfile.baseURL) && (
				<div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-xs text-muted-foreground leading-relaxed">
					<Scale className="size-3.5 inline-block mr-1 -mt-0.5 text-amber-600" />
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

			{preset.requiresAccountId && (
				<div className="flex flex-col gap-1.5">
					<label htmlFor="account-id" className="text-sm font-medium">
						{t('ext.config.accountId')}
					</label>
					<Input
						id="account-id"
						placeholder={t('ext.config.accountIdPlaceholder')}
						value={activeProfile.accountId ?? ''}
						onChange={(e) => updateActive({ accountId: e.target.value })}
						className="text-sm h-9 font-mono"
					/>
					{preset.accountIdHelpURL && (
						<a
							href={preset.accountIdHelpURL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
						>
							{t('ext.config.accountIdHelp')}
							<ExternalLink className="size-3" />
						</a>
					)}
				</div>
			)}

			{preset.requiresApiKey && (
				<div className="flex flex-col gap-1.5">
					<label htmlFor="api-key" className="text-sm font-medium">
						{t('ext.config.apiKey')}
					</label>
					<div className="flex gap-2 items-center">
						<Input
							id="api-key"
							type={showApiKey ? 'text' : 'password'}
							value={activeProfile.apiKey ?? ''}
							onChange={(e) => updateActive({ apiKey: e.target.value })}
							className="text-sm h-9"
						/>
						<Button
							variant="outline"
							size="icon"
							className="h-9 w-9 shrink-0 cursor-pointer"
							onClick={() => setShowApiKey(!showApiKey)}
							aria-label={showApiKey ? t('ext.config.hideApiKey') : t('ext.config.showApiKey')}
						>
							{showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
						</Button>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<label htmlFor="model" className="text-sm font-medium">
					{t('ext.config.model')}
				</label>
				<Combobox
					id="model"
					value={activeProfile.model ?? ''}
					onChange={(model) => updateActive({ model })}
					options={modelOptions}
					placeholder={preset.defaultModel || DEMO_MODEL}
					allowCustom={allowCustomModel}
					emptyText={t('ext.config.modelNoMatch')}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="cursor-pointer"
						onClick={handleTestConnection}
						disabled={testState.status === 'running'}
					>
						{testState.status === 'running' ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<CheckCircle2 className="size-4" />
						)}
						{testState.status === 'running'
							? t('ext.config.testConnectionRunning')
							: t('ext.config.testConnection')}
					</Button>
				</div>
				{testState.status === 'success' && (
					<div className="flex items-center gap-1.5 text-xs text-emerald-600">
						<CheckCircle2 className="size-3.5" />
						{t('ext.config.testConnectionSuccess')}
					</div>
				)}
				{testState.status === 'error' && (
					<div className="flex items-start gap-1.5 text-xs text-red-500">
						<XCircle className="size-3.5 mt-0.5 shrink-0" />
						<span className="break-words">
							{t('ext.config.testConnectionFailed', { message: testState.message })}
						</span>
					</div>
				)}
			</div>

			{!showProfileSelector && (
				<div className="pt-2">
					<button
						type="button"
						onClick={handleAdd}
						className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
					>
						<Plus className="size-3" />
						{t('ext.config.addAnotherProfile')}
					</button>
				</div>
			)}
		</div>
	)
}
