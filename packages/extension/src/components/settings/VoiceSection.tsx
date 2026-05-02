import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, Mic, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
	STT_PROVIDERS,
	TTS_PROVIDERS,
	VOICE_PROVIDERS_BY_KEY,
	type VoiceProvider,
	type VoiceProviderKey,
} from '@/agent/voiceProviders'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/lib/i18n'
import { createVoiceController } from '@/voice/clients'
import type { VoiceConfig } from '@/voice/types'

interface VoiceSectionProps {
	value: VoiceConfig
	onChange: (next: VoiceConfig) => void
	/** Active chat credentials, reused for OpenAI-compatible audio providers. */
	llm: { baseURL: string; apiKey?: string }
}

function sameHost(a?: string, b?: string): boolean {
	if (!a || !b) return false
	try {
		return new URL(a).host === new URL(b).host
	} catch {
		return false
	}
}

function reusesChatKey(
	provider: VoiceProvider,
	llm: { baseURL: string; apiKey?: string }
): boolean {
	return Boolean(
		provider.reusesLlmCredentials && sameHost(provider.baseURL, llm.baseURL) && llm.apiKey
	)
}

/** Web Speech voices, discovered at runtime (may populate asynchronously). */
function useWebSpeechVoices(active: boolean): ComboboxOption[] {
	const [voices, setVoices] = useState<ComboboxOption[]>([])
	useEffect(() => {
		if (!active || !('speechSynthesis' in window)) return
		const read = () => {
			setVoices(
				window.speechSynthesis
					.getVoices()
					.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` }))
			)
		}
		read()
		window.speechSynthesis.addEventListener('voiceschanged', read)
		return () => window.speechSynthesis.removeEventListener('voiceschanged', read)
	}, [active])
	return voices
}

export function VoiceSection({ value, onChange, llm }: VoiceSectionProps) {
	const t = useT()
	const [showSttKey, setShowSttKey] = useState(false)
	const [showTtsKey, setShowTtsKey] = useState(false)
	const [testState, setTestState] = useState<
		| { status: 'idle' }
		| { status: 'running' }
		| { status: 'success' }
		| { status: 'error'; message: string }
	>({ status: 'idle' })

	const sttProvider = VOICE_PROVIDERS_BY_KEY[value.sttProviderKey]
	const ttsProvider = VOICE_PROVIDERS_BY_KEY[value.ttsProviderKey]

	const webSpeechTtsVoices = useWebSpeechVoices(ttsProvider?.clientType === 'webspeech')

	const update = (patch: Partial<VoiceConfig>) => onChange({ ...value, ...patch })
	const setApiKey = (key: VoiceProviderKey, apiKey: string) =>
		update({ apiKeys: { ...value.apiKeys, [key]: apiKey } })

	const handleSttProvider = (key: VoiceProviderKey) => {
		const p = VOICE_PROVIDERS_BY_KEY[key]
		update({ sttProviderKey: key, sttModel: p.defaultSttModel ?? '' })
	}
	const handleTtsProvider = (key: VoiceProviderKey) => {
		const p = VOICE_PROVIDERS_BY_KEY[key]
		update({ ttsProviderKey: key, ttsModel: p.defaultTtsModel ?? '', voice: p.defaultVoice ?? '' })
	}

	const voiceOptions: ComboboxOption[] = useMemo(() => {
		if (ttsProvider?.clientType === 'webspeech') return webSpeechTtsVoices
		return (ttsProvider?.voices ?? []).map((v) => ({ value: v.id, label: v.label ?? v.id }))
	}, [ttsProvider, webSpeechTtsVoices])

	const handleTest = async () => {
		setTestState({ status: 'running' })
		const controller = createVoiceController({ ...value, enabled: true }, llm)
		if (!controller) {
			setTestState({ status: 'error', message: t('ext.voice.testNoController') })
			return
		}
		try {
			await controller.speak(t('ext.voice.testPhrase'))
			setTestState({ status: 'success' })
		} catch (err) {
			setTestState({ status: 'error', message: (err as Error)?.message || 'Error' })
		} finally {
			controller.dispose()
		}
	}

	const sttReused = reusesChatKey(sttProvider, llm)
	const ttsReused = reusesChatKey(ttsProvider, llm)

	return (
		<div className="flex flex-col gap-6 max-w-2xl">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-base font-semibold">{t('ext.voice.title')}</h2>
				<p className="text-sm text-muted-foreground">{t('ext.voice.description')}</p>
			</div>

			<label className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">{t('ext.voice.enabled')}</span>
					<span className="text-xs text-muted-foreground">{t('ext.voice.enabledHelp')}</span>
				</div>
				<Switch checked={value.enabled} onCheckedChange={(enabled) => update({ enabled })} />
			</label>

			{value.enabled && (
				<>
					{/* Speech-to-text */}
					<div className="flex flex-col gap-3 rounded-md border border-border p-3">
						<h3 className="text-sm font-semibold">{t('ext.voice.sttHeading')}</h3>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								{t('ext.voice.provider')}
							</label>
							<Select
								value={value.sttProviderKey}
								onChange={(v) => handleSttProvider(v as VoiceProviderKey)}
								options={STT_PROVIDERS.map((p) => ({ value: p.key, label: p.label }))}
							/>
						</div>
						{sttProvider?.sttModels.length > 0 && (
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									{t('ext.voice.model')}
								</label>
								<Combobox
									value={value.sttModel}
									onChange={(sttModel) => update({ sttModel })}
									options={sttProvider.sttModels.map((m) => ({
										value: m.id,
										label: m.label ?? m.id,
									}))}
									placeholder={sttProvider.defaultSttModel ?? ''}
									allowCustom
									emptyText={t('ext.config.modelNoMatch')}
								/>
							</div>
						)}
						{sttProvider?.requiresApiKey && !sttReused && (
							<ApiKeyField
								label={t('ext.voice.apiKey')}
								value={value.apiKeys[value.sttProviderKey] ?? ''}
								onChange={(v) => setApiKey(value.sttProviderKey, v)}
								show={showSttKey}
								onToggleShow={() => setShowSttKey((s) => !s)}
								apiKeyURL={sttProvider.apiKeyURL}
								getKeyLabel={t('ext.config.getApiKey')}
							/>
						)}
						{sttReused && (
							<p className="text-xs text-muted-foreground">{t('ext.voice.reusingChatKey')}</p>
						)}
					</div>

					{/* Text-to-speech */}
					<div className="flex flex-col gap-3 rounded-md border border-border p-3">
						<h3 className="text-sm font-semibold">{t('ext.voice.ttsHeading')}</h3>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								{t('ext.voice.provider')}
							</label>
							<Select
								value={value.ttsProviderKey}
								onChange={(v) => handleTtsProvider(v as VoiceProviderKey)}
								options={TTS_PROVIDERS.map((p) => ({ value: p.key, label: p.label }))}
							/>
						</div>
						{ttsProvider?.ttsModels.length > 0 && (
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									{t('ext.voice.model')}
								</label>
								<Combobox
									value={value.ttsModel}
									onChange={(ttsModel) => update({ ttsModel })}
									options={ttsProvider.ttsModels.map((m) => ({
										value: m.id,
										label: m.label ?? m.id,
									}))}
									placeholder={ttsProvider.defaultTtsModel ?? ''}
									allowCustom
									emptyText={t('ext.config.modelNoMatch')}
								/>
							</div>
						)}
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								{t('ext.voice.voice')}
							</label>
							<Combobox
								value={value.voice}
								onChange={(voice) => update({ voice })}
								options={voiceOptions}
								placeholder={ttsProvider?.defaultVoice ?? t('ext.voice.voicePlaceholder')}
								allowCustom
								emptyText={t('ext.voice.noVoices')}
							/>
						</div>
						{ttsProvider?.requiresApiKey && !ttsReused && (
							<ApiKeyField
								label={t('ext.voice.apiKey')}
								value={value.apiKeys[value.ttsProviderKey] ?? ''}
								onChange={(v) => setApiKey(value.ttsProviderKey, v)}
								show={showTtsKey}
								onToggleShow={() => setShowTtsKey((s) => !s)}
								apiKeyURL={ttsProvider.apiKeyURL}
								getKeyLabel={t('ext.config.getApiKey')}
							/>
						)}
						{ttsReused && (
							<p className="text-xs text-muted-foreground">{t('ext.voice.reusingChatKey')}</p>
						)}
					</div>

					{/* Interaction */}
					<div className="flex flex-col gap-3 rounded-md border border-border p-3">
						<h3 className="text-sm font-semibold">{t('ext.voice.interactionHeading')}</h3>
						<label className="flex items-center justify-between gap-4">
							<span className="text-sm">{t('ext.voice.autoSpeak')}</span>
							<Switch
								checked={value.autoSpeakResponses}
								onCheckedChange={(autoSpeakResponses) => update({ autoSpeakResponses })}
							/>
						</label>
						<label className="flex items-center justify-between gap-4">
							<div className="flex flex-col gap-0.5">
								<span className="text-sm">{t('ext.voice.pushToTalk')}</span>
								<span className="text-xs text-muted-foreground">
									{t('ext.voice.pushToTalkHelp')}
								</span>
							</div>
							<Switch
								checked={value.pushToTalk}
								onCheckedChange={(pushToTalk) => update({ pushToTalk })}
							/>
						</label>
						{value.pushToTalk && (
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									{t('ext.voice.holdKey')}
								</label>
								<Input
									value={value.holdKey}
									onChange={(e) => update({ holdKey: e.target.value })}
									placeholder="Alt"
									className="h-9 text-sm font-mono max-w-40"
								/>
								<p className="text-xs text-muted-foreground">{t('ext.voice.holdKeyHelp')}</p>
							</div>
						)}
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								{t('ext.voice.language')}
							</label>
							<Input
								value={value.language ?? ''}
								onChange={(e) => update({ language: e.target.value || undefined })}
								placeholder={t('ext.voice.languagePlaceholder')}
								className="h-9 text-sm max-w-40"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="cursor-pointer"
								onClick={handleTest}
								disabled={testState.status === 'running'}
							>
								{testState.status === 'running' ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Mic className="size-4" />
								)}
								{t('ext.voice.test')}
							</Button>
						</div>
						{testState.status === 'success' && (
							<div className="flex items-center gap-1.5 text-xs text-emerald-600">
								<CheckCircle2 className="size-3.5" />
								{t('ext.voice.testSuccess')}
							</div>
						)}
						{testState.status === 'error' && (
							<div className="flex items-start gap-1.5 text-xs text-red-500">
								<XCircle className="size-3.5 mt-0.5 shrink-0" />
								<span className="break-words">{testState.message}</span>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	)
}

function ApiKeyField(props: {
	label: string
	value: string
	onChange: (v: string) => void
	show: boolean
	onToggleShow: () => void
	apiKeyURL?: string
	getKeyLabel: string
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-xs font-medium text-muted-foreground">{props.label}</label>
			<div className="flex gap-2 items-center">
				<Input
					type={props.show ? 'text' : 'password'}
					value={props.value}
					onChange={(e) => props.onChange(e.target.value)}
					className="h-9 text-sm"
				/>
				<Button
					variant="outline"
					size="icon"
					className="h-9 w-9 shrink-0 cursor-pointer"
					onClick={props.onToggleShow}
					type="button"
				>
					{props.show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
				</Button>
			</div>
			{props.apiKeyURL && (
				<a
					href={props.apiKeyURL}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
				>
					{props.getKeyLabel}
					<ExternalLink className="size-3" />
				</a>
			)}
		</div>
	)
}
