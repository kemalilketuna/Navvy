import { ExternalLink, Eye, EyeOff, Plus, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { DEMO_BASE_URL, DEMO_MODEL, isTestingEndpoint } from '@/agent/constants'
import { type LLMProfile, newProfileId } from '@/agent/profiles'
import { PROVIDERS, PROVIDERS_BY_KEY, type ProviderKey } from '@/agent/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
	const currentPreset = activeProfile ? PROVIDERS_BY_KEY[activeProfile.providerKey] : undefined

	const updateActive = (patch: Partial<LLMProfile>) => {
		onProfilesChange(profiles.map((p) => (p.id === activeProfile.id ? { ...p, ...patch } : p)))
	}

	const handleProviderChange = (key: ProviderKey) => {
		if (!activeProfile) return
		if (key === 'custom') {
			updateActive({ providerKey: 'custom' })
			return
		}
		const preset = PROVIDERS_BY_KEY[key]
		updateActive({ providerKey: key, baseURL: preset.baseURL, model: preset.defaultModel })
	}

	const handleAdd = () => {
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

	if (!activeProfile) return null

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.config.profile')}</label>
				<div className="flex gap-2 items-center">
					<select
						value={activeProfile.id}
						onChange={(e) => onActiveProfileChange(e.target.value)}
						className="native-select-chevron h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-input bg-background px-2 pr-10 text-sm"
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

			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.config.provider')}</label>
				<select
					value={activeProfile.providerKey}
					onChange={(e) => handleProviderChange(e.target.value as ProviderKey)}
					className="native-select-chevron h-9 cursor-pointer rounded-md border border-input bg-background px-2 pr-10 text-sm"
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
						className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
					>
						{t('ext.config.getApiKey')}
						<ExternalLink className="size-3" />
					</a>
				)}
			</div>

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

			<div className="flex flex-col gap-1.5">
				<label htmlFor="model" className="text-sm font-medium">
					{t('ext.config.model')}
				</label>
				<Input
					id="model"
					placeholder={currentPreset?.defaultModel || DEMO_MODEL}
					value={activeProfile.model ?? ''}
					onChange={(e) => updateActive({ model: e.target.value })}
					className="text-sm h-9"
				/>
			</div>

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
		</div>
	)
}
