import { ExternalLink, Eye, EyeOff, Plus, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { DEMO_BASE_URL, DEMO_MODEL, isTestingEndpoint } from '@/agent/constants'
import { type LLMProfile, type ProviderCredentials, newProfileId } from '@/agent/profiles'
import { PROVIDERS, PROVIDERS_BY_KEY, type ProviderKey } from '@/agent/providers'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useT } from '@/lib/i18n'

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
							className="h-9 w-9 shrink-0 cursor-pointer"
							onClick={handleDelete}
							disabled={profiles.length <= 1}
							aria-label={t('ext.config.profileDelete')}
							title={t('ext.config.profileDelete')}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
					<Input
						placeholder={t('ext.config.profileNamePlaceholder')}
						value={activeProfile.name}
						onChange={(e) => updateActive({ name: e.target.value })}
						className="text-sm h-9 mt-1"
					/>
				</div>
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
