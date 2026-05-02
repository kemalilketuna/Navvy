import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, Scale, XCircle } from 'lucide-react'
import { useState } from 'react'

import { DEMO_BASE_URL, DEMO_MODEL, isTestingEndpoint } from '@/agent/constants'
import {
	PROVIDERS,
	PROVIDERS_BY_KEY,
	type ProviderConfig,
	type ProviderCredentials,
	type ProviderKey,
} from '@/agent/providers'
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
	config: ProviderConfig
	onChange: (config: ProviderConfig) => void
}

export function ProvidersSection({ config, onChange }: ProvidersSectionProps) {
	const t = useT()
	const [showApiKey, setShowApiKey] = useState(false)
	const [testState, setTestState] = useState<
		| { status: 'idle' }
		| { status: 'running' }
		| { status: 'success' }
		| { status: 'error'; message: string }
	>({ status: 'idle' })

	const preset = PROVIDERS_BY_KEY[config.providerKey]
	if (!preset) return null

	const update = (patch: Partial<ProviderConfig>) => {
		onChange({ ...config, ...patch })
	}

	const handleProviderChange = (key: ProviderKey) => {
		if (key === config.providerKey) return
		const nextPreset = PROVIDERS_BY_KEY[key]
		const prevKey = config.providerKey

		const stashedCurrent: ProviderCredentials = {
			apiKey: config.apiKey,
			accountId: config.accountId,
			baseURL: config.baseURL,
			model: config.model,
		}
		const savedCredentials = {
			...(config.savedCredentials ?? {}),
			[prevKey]: stashedCurrent,
		}
		const restored = savedCredentials[key]

		update({
			providerKey: key,
			baseURL: restored?.baseURL ?? nextPreset.baseURL,
			model: restored?.model ?? nextPreset.defaultModel,
			apiKey: restored?.apiKey,
			accountId: nextPreset.requiresAccountId ? restored?.accountId : undefined,
			savedCredentials,
		})
	}

	const handleTestConnection = async () => {
		if (preset.requiresApiKey && !config.apiKey) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingApiKey') })
			return
		}
		if (preset.requiresAccountId && !config.accountId) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingAccountId') })
			return
		}
		if (!config.model) {
			setTestState({ status: 'error', message: t('ext.config.testConnectionMissingModel') })
			return
		}
		const baseURL = preset.buildBaseURL
			? preset.buildBaseURL({ accountId: config.accountId })
			: (config.baseURL ?? preset.baseURL)
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
					...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
				},
				body: JSON.stringify({
					model: config.model,
					messages: [{ role: 'user', content: 'ping' }],
					...tokenLimitBody(config.model),
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
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t('ext.config.provider')}</label>
				<Select
					value={config.providerKey}
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
						value={config.baseURL ?? DEMO_BASE_URL}
						onChange={(e) => update({ baseURL: e.target.value, providerKey: 'custom' })}
						className="text-sm h-9"
					/>
				</div>
			)}

			{isTestingEndpoint(config.baseURL) && (
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
						value={config.accountId ?? ''}
						onChange={(e) => update({ accountId: e.target.value })}
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
							value={config.apiKey ?? ''}
							onChange={(e) => update({ apiKey: e.target.value })}
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
					value={config.model ?? ''}
					onChange={(model) => update({ model })}
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
		</div>
	)
}
