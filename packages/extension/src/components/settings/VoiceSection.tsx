import {
	CheckCircle2,
	ExternalLink,
	Eye,
	EyeOff,
	Loader2,
	Mic,
	Square,
	Volume2,
	XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { LANGUAGE_NAMES } from '@/agent/MultiPageAgent'
import {
	STT_PROVIDERS,
	TTS_PROVIDERS,
	VOICE_PROVIDERS_BY_KEY,
	type VoiceProviderKey,
	reusesChatKey,
} from '@/agent/voiceProviders'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/lib/i18n'
import { createVoiceController } from '@/voice/clients'
import {
	type MicPermissionState,
	queryMicPermission,
	requestMicPermission,
} from '@/voice/micPermission'
import type { VoiceConfig } from '@/voice/types'

interface VoiceSectionProps {
	value: VoiceConfig
	onChange: (next: VoiceConfig) => void
	/** Active chat credentials, reused for OpenAI-compatible audio providers. */
	llm: { baseURL: string; apiKey?: string }
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
	const [ttsTest, setTtsTest] = useState<
		| { status: 'idle' }
		| { status: 'running' }
		| { status: 'success' }
		| { status: 'error'; message: string }
	>({ status: 'idle' })
	const [sttTest, setSttTest] = useState<
		| { status: 'idle' }
		| { status: 'listening' }
		| { status: 'transcribing' }
		| { status: 'success'; text: string }
		| { status: 'error'; message: string }
	>({ status: 'idle' })
	// Held across start→stop of an in-progress STT test capture.
	const sttControllerRef = useRef<ReturnType<typeof createVoiceController>>(null)

	// Dispose any dangling test capture on unmount.
	useEffect(
		() => () => {
			sttControllerRef.current?.dispose()
			sttControllerRef.current = null
		},
		[]
	)

	// Auto + the languages the extension supports, as base ISO-639-1 codes so the
	// hint is accepted by network STT (OpenAI/ElevenLabs want ISO-639-1) and works
	// for Web Speech too.
	const languageOptions = useMemo(
		() => [
			{ value: '', label: t('ext.settings.languageAuto') },
			...Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
				value: code.split('-')[0],
				label: name,
			})),
		],
		[t]
	)

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

	// Synthesize + play the test phrase, exercising the TTS provider/credentials.
	const handleTtsTest = async () => {
		setTtsTest({ status: 'running' })
		const controller = createVoiceController({ ...value, enabled: true }, llm)
		if (!controller) {
			setTtsTest({ status: 'error', message: t('ext.voice.testNoController') })
			return
		}
		try {
			await controller.speak(t('ext.voice.testPhrase'))
			setTtsTest({ status: 'success' })
		} catch (err) {
			setTtsTest({ status: 'error', message: (err as Error)?.message || 'Error' })
		} finally {
			controller.dispose()
		}
	}

	// Record from the mic, then transcribe — a full STT round-trip that validates
	// the provider, credentials, and endpoint. Toggles: first click records, second
	// stops and transcribes.
	const handleSttTest = async () => {
		if (sttTest.status === 'listening') {
			const controller = sttControllerRef.current
			setSttTest({ status: 'transcribing' })
			try {
				const text = (await controller?.stopListening()) ?? ''
				setSttTest({ status: 'success', text: text.trim() })
			} catch (err) {
				setSttTest({ status: 'error', message: (err as Error)?.message || 'Error' })
			} finally {
				controller?.dispose()
				sttControllerRef.current = null
			}
			return
		}

		const controller = createVoiceController({ ...value, enabled: true }, llm)
		if (!controller) {
			setSttTest({ status: 'error', message: t('ext.voice.testNoController') })
			return
		}
		sttControllerRef.current = controller
		try {
			await controller.startListening()
			setSttTest({ status: 'listening' })
		} catch (err) {
			setSttTest({ status: 'error', message: (err as Error)?.message || 'Error' })
			controller.dispose()
			sttControllerRef.current = null
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
					<MicPermission />

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
						<div className="flex flex-col gap-2">
							<div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="cursor-pointer"
									onClick={handleSttTest}
									disabled={sttTest.status === 'transcribing'}
								>
									{sttTest.status === 'transcribing' ? (
										<Loader2 className="size-4 animate-spin" />
									) : sttTest.status === 'listening' ? (
										<Square className="size-4 fill-current text-red-500" />
									) : (
										<Mic className="size-4" />
									)}
									{sttTest.status === 'listening'
										? t('ext.input.voice.listening')
										: sttTest.status === 'transcribing'
											? t('ext.input.voice.transcribing')
											: t('ext.voice.testStt')}
								</Button>
							</div>
							{sttTest.status === 'success' && (
								<div className="flex items-start gap-1.5 text-xs text-emerald-600">
									<CheckCircle2 className="size-3.5 mt-0.5 shrink-0" />
									<span className="break-words">
										{sttTest.text
											? t('ext.voice.testHeard', { text: sttTest.text })
											: t('ext.input.voice.noSpeech')}
									</span>
								</div>
							)}
							{sttTest.status === 'error' && (
								<div className="flex items-start gap-1.5 text-xs text-red-500">
									<XCircle className="size-3.5 mt-0.5 shrink-0" />
									<span className="break-words">{sttTest.message}</span>
								</div>
							)}
						</div>
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
						<div className="flex flex-col gap-2">
							<div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="cursor-pointer"
									onClick={handleTtsTest}
									disabled={ttsTest.status === 'running'}
								>
									{ttsTest.status === 'running' ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Volume2 className="size-4" />
									)}
									{t('ext.voice.test')}
								</Button>
							</div>
							{ttsTest.status === 'success' && (
								<div className="flex items-center gap-1.5 text-xs text-emerald-600">
									<CheckCircle2 className="size-3.5" />
									{t('ext.voice.testSuccess')}
								</div>
							)}
							{ttsTest.status === 'error' && (
								<div className="flex items-start gap-1.5 text-xs text-red-500">
									<XCircle className="size-3.5 mt-0.5 shrink-0" />
									<span className="break-words">{ttsTest.message}</span>
								</div>
							)}
						</div>
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
							<Select
								value={value.language ?? ''}
								onChange={(next) => update({ language: next || undefined })}
								options={languageOptions}
								className="max-w-40"
							/>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

/**
 * Microphone access control. Lives in settings (which opens in a tab) because
 * the side panel cannot show the permission prompt; the grant persists for the
 * whole extension origin.
 */
function MicPermission() {
	const t = useT()
	const [state, setState] = useState<MicPermissionState>('unknown')
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		queryMicPermission().then(setState)
	}, [])

	const grant = async () => {
		setBusy(true)
		try {
			await requestMicPermission()
			setState('granted')
		} catch {
			setState('denied')
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="flex flex-col gap-2 rounded-md border border-border p-3">
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">{t('ext.voice.micAccess')}</span>
					<span className="text-xs text-muted-foreground">{t('ext.voice.micAccessHelp')}</span>
				</div>
				{state === 'granted' ? (
					<span className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-600">
						<CheckCircle2 className="size-3.5" />
						{t('ext.voice.micGranted')}
					</span>
				) : (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="shrink-0 cursor-pointer"
						onClick={grant}
						disabled={busy}
					>
						{busy ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
						{t('ext.voice.micGrant')}
					</Button>
				)}
			</div>
			{state === 'denied' && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-start gap-1.5 text-xs text-red-500">
						<XCircle className="mt-0.5 size-3.5 shrink-0" />
						<span>{t('ext.voice.micDenied')}</span>
					</div>
					<button
						type="button"
						onClick={() => queryMicPermission().then(setState)}
						className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
					>
						{t('ext.voice.micCheck')}
					</button>
				</div>
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
