import { GraduationCap, Loader2, Mic, Square, Wand2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { type RefineCredentials, type RefinedSkill, refineSkill } from '@/agent/skillRefiner'
import type { Skill } from '@/agent/skills'
import type { VoiceState } from '@/agent/useAgent'
import { SkillEditor } from '@/components/settings/SkillEditor'
import { makeSkill } from '@/components/settings/SkillsSection'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface TeachScreenProps {
	onClose: () => void
	voiceEnabled: boolean
	voiceState: VoiceState
	startListening: () => Promise<void>
	stopListening: () => Promise<string>
	micUnavailable: boolean
	onMicBlocked: () => void
	llm: RefineCredentials
}

async function activeTabUrl(): Promise<string> {
	try {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		return tab?.url ?? ''
	} catch {
		return ''
	}
}

async function persistSkill(skill: Skill): Promise<void> {
	const stored = await chrome.storage.local.get('skills')
	const skills = (stored.skills as Skill[]) ?? []
	await chrome.storage.local.set({ skills: [...skills, skill] })
}

export function TeachScreen({
	onClose,
	voiceEnabled,
	voiceState,
	startListening,
	stopListening,
	micUnavailable,
	onMicBlocked,
	llm,
}: TeachScreenProps) {
	const t = useT()
	const [transcript, setTranscript] = useState('')
	const [pageUrl, setPageUrl] = useState('')
	const [refining, setRefining] = useState(false)
	const [draft, setDraft] = useState<RefinedSkill | null>(null)

	const llmReady = Boolean(llm.baseURL && llm.model)
	const isRecording = voiceState === 'recording'
	const isTranscribing = voiceState === 'transcribing'

	useEffect(() => {
		activeTabUrl().then(setPageUrl)
	}, [])

	// Esc closes the screen.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onClose()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [onClose])

	const appendTranscript = useCallback(
		(text: string) => {
			const trimmed = text.trim()
			if (!trimmed) {
				toast.warning(t('ext.input.voice.noSpeech'))
				return
			}
			setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed))
		},
		[t]
	)

	const reportVoiceError = useCallback(
		(err: unknown) => {
			console.error('[Teach] Voice failed:', err)
			toast.error(`${t('ext.input.voice.failed')}: ${err instanceof Error ? err.message : err}`)
		},
		[t]
	)

	const handleMicToggle = useCallback(() => {
		if (isRecording) {
			stopListening().then(appendTranscript).catch(reportVoiceError)
		} else if (micUnavailable) {
			onMicBlocked()
		} else {
			startListening().catch(reportVoiceError)
		}
	}, [
		isRecording,
		micUnavailable,
		onMicBlocked,
		startListening,
		stopListening,
		appendTranscript,
		reportVoiceError,
	])

	const handleRefine = async () => {
		if (!transcript.trim()) {
			toast.warning(t('ext.teach.needTranscript'))
			return
		}
		if (!llmReady) {
			toast.warning(t('ext.skills.refineNeedsLlm'))
			return
		}
		setRefining(true)
		try {
			const refined = await refineSkill(llm, { transcript, url: pageUrl || undefined })
			setDraft(refined)
		} catch (err) {
			toast.error(`${t('ext.teach.refineFailed')}: ${err instanceof Error ? err.message : err}`)
		} finally {
			setRefining(false)
		}
	}

	const handleSave = async () => {
		if (!draft) return
		try {
			await persistSkill(makeSkill({ ...draft, sourceTranscript: transcript }))
			toast.success(t('ext.teach.saved'))
			onClose()
		} catch (err) {
			console.error('[Teach] Failed to save skill:', err)
			toast.error(t('ext.teach.refineFailed'))
		}
	}

	const micLabel = isRecording
		? t('ext.teach.stop')
		: isTranscribing
			? t('ext.teach.transcribing')
			: t('ext.teach.record')

	return (
		<div className="flex h-screen min-h-0 flex-col bg-background text-foreground">
			<header className="flex shrink-0 items-center gap-2 px-4 py-3">
				<GraduationCap className="size-5 text-muted-foreground" />
				<h1 className="text-base font-semibold">{t('ext.teach.title')}</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="ml-auto size-7 cursor-pointer text-muted-foreground hover:text-foreground"
					aria-label={t('ext.teach.close')}
					title={t('ext.teach.close')}
				>
					<X className="size-4" />
				</Button>
			</header>

			<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
				{!draft ? (
					<>
						<p className="text-sm text-muted-foreground">{t('ext.teach.hint')}</p>

						{voiceEnabled ? (
							<div className="flex flex-col items-center gap-3 py-2">
								<span className="relative flex">
									{isRecording && (
										<span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500/40" />
									)}
									<Button
										type="button"
										size="icon"
										onClick={handleMicToggle}
										disabled={isTranscribing}
										className={cn(
											'relative size-16 rounded-full',
											isRecording
												? 'bg-red-600 text-white hover:bg-red-500'
												: 'bg-amber-600 text-white hover:bg-amber-500'
										)}
										aria-label={micLabel}
										title={micLabel}
									>
										{isTranscribing ? (
											<Loader2 className="size-6 animate-spin" />
										) : isRecording ? (
											<Square className="size-5 fill-current" />
										) : (
											<Mic className="size-6" />
										)}
									</Button>
								</span>
								<span className="text-xs text-muted-foreground">{micLabel}</span>
							</div>
						) : (
							<p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
								{t('ext.teach.noVoiceHint')}
							</p>
						)}

						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								{t('ext.teach.transcript')}
							</label>
							<Textarea
								value={transcript}
								onChange={(e) => setTranscript(e.target.value)}
								placeholder={t('ext.teach.transcriptPlaceholder')}
								className="min-h-32 text-sm"
							/>
						</div>

						<Button onClick={handleRefine} disabled={refining || !transcript.trim()}>
							{refining ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Wand2 className="size-4" />
							)}
							{refining ? t('ext.teach.refining') : t('ext.teach.refine')}
						</Button>
					</>
				) : (
					<>
						<p className="text-sm text-muted-foreground">{t('ext.teach.review')}</p>
						<div className="rounded-md border border-border p-3">
							<SkillEditor
								skill={draft}
								onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDraft(null)}>
								{t('ext.teach.discard')}
							</Button>
							<Button onClick={handleSave} disabled={!draft.name.trim() || !draft.plan.trim()}>
								{t('ext.teach.save')}
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
