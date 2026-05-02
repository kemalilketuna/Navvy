import { GraduationCap, Loader2, Mic, MousePointer2, Square, Wand2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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

interface ActiveTab {
	url: string
	title: string
	favIconUrl: string
}

async function getActiveTab(): Promise<ActiveTab> {
	try {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		return { url: tab?.url ?? '', title: tab?.title ?? '', favIconUrl: tab?.favIconUrl ?? '' }
	} catch {
		return { url: '', title: '', favIconUrl: '' }
	}
}

async function persistSkill(skill: Skill): Promise<void> {
	const stored = await chrome.storage.local.get('skills')
	const skills = (stored.skills as Skill[]) ?? []
	await chrome.storage.local.set({ skills: [...skills, skill] })
}

/** Calm, screenshot-inspired mark: two browser-window cards with a cursor. */
function WorkflowIllustration({ active }: { active?: boolean }) {
	return (
		<div className="flex items-center justify-center gap-2 py-2" aria-hidden="true">
			<div
				className={cn(
					'relative h-28 w-44 overflow-hidden rounded-2xl bg-[#f7f6f3] shadow-md ring-1 ring-black/[0.03] transition-shadow',
					active && 'ring-2 ring-red-500/60'
				)}
			>
				<div className="h-7 w-full border-b border-black/[0.06] bg-[#fcfbf9]" />
				<div className="flex gap-1.5 px-3 pt-2.5">
					<div className="h-4 w-10 rounded-md border border-black/[0.06] bg-white" />
					<div className="h-4 w-10 rounded-md border border-black/[0.06] bg-white" />
					<div className="h-4 w-10 rounded-md border border-black/[0.06] bg-white" />
				</div>
				<MousePointer2 className="absolute bottom-3 right-5 size-5 text-neutral-700" fill="white" />
			</div>
			<div className="h-24 w-14 rounded-2xl bg-[#f7f6f3] shadow-md ring-1 ring-black/[0.03]" />
		</div>
	)
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
	const [tab, setTab] = useState<ActiveTab>({ url: '', title: '', favIconUrl: '' })
	const [refining, setRefining] = useState(false)
	const [draft, setDraft] = useState<RefinedSkill | null>(null)

	const llmReady = Boolean(llm.baseURL && llm.model)
	const isRecording = voiceState === 'recording'
	const isTranscribing = voiceState === 'transcribing'
	const hasTranscript = transcript.trim().length > 0

	useEffect(() => {
		getActiveTab().then(setTab)
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
		if (!hasTranscript) {
			toast.warning(t('ext.teach.needTranscript'))
			return
		}
		if (!llmReady) {
			toast.warning(t('ext.skills.refineNeedsLlm'))
			return
		}
		setRefining(true)
		try {
			const refined = await refineSkill(llm, { transcript, url: tab.url || undefined })
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

	// Footer footprint: a lone full-width mic pill (screenshot vibe) until there's
	// something to refine, then mic shrinks to an icon beside the Refine action.
	const micFull = voiceEnabled && !hasTranscript

	return (
		<div className="flex h-screen min-h-0 flex-col bg-background text-foreground">
			<header className="flex shrink-0 items-center gap-2 px-4 py-3">
				{tab.favIconUrl ? (
					<img src={tab.favIconUrl} alt="" className="size-4 shrink-0 rounded-sm" />
				) : (
					<GraduationCap className="size-4 shrink-0 text-muted-foreground" />
				)}
				<span className="min-w-0 flex-1 truncate text-sm font-medium" title={tab.title}>
					{tab.title || t('ext.teach.title')}
				</span>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="size-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
					aria-label={t('ext.teach.close')}
					title={t('ext.teach.close')}
				>
					<X className="size-4" />
				</Button>
			</header>

			{!draft ? (
				<>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
						<div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
							<WorkflowIllustration active={isRecording} />
							<div className="flex flex-col gap-2">
								<h2 className="text-lg font-semibold">{t('ext.teach.title')}</h2>
								<p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
									{t('ext.teach.hint')}
								</p>
							</div>
						</div>

						{(hasTranscript || !voiceEnabled) && (
							<div className="flex flex-col gap-1.5 pb-4">
								<label className="text-xs font-medium text-muted-foreground">
									{t('ext.teach.transcript')}
								</label>
								<Textarea
									value={transcript}
									onChange={(e) => setTranscript(e.target.value)}
									placeholder={t('ext.teach.transcriptPlaceholder')}
									className="min-h-24 text-sm"
								/>
								{!voiceEnabled && (
									<p className="text-xs text-muted-foreground">{t('ext.teach.noVoiceHint')}</p>
								)}
							</div>
						)}
					</div>

					<div className="shrink-0 px-3 pb-3">
						<div className="flex items-center gap-2 rounded-xl border border-white/5 bg-neutral-900/60 p-2">
							{voiceEnabled && (
								<span className={cn('relative flex', micFull && 'flex-1')}>
									{isRecording && (
										<span className="pointer-events-none absolute inset-0 animate-ping rounded-lg bg-red-500/30" />
									)}
									<Button
										type="button"
										onClick={handleMicToggle}
										disabled={isTranscribing}
										className={cn(
											'relative h-10 gap-2 rounded-lg border border-white/10 text-sm font-medium',
											micFull ? 'w-full' : 'w-10 px-0',
											isRecording
												? 'border-transparent bg-red-600 text-white hover:bg-red-500'
												: 'bg-white/10 text-foreground hover:bg-white/15'
										)}
										aria-label={micLabel}
										title={micLabel}
									>
										{isTranscribing ? (
											<Loader2 className="size-4 animate-spin" />
										) : isRecording ? (
											<Square className="size-3.5 fill-current" />
										) : (
											<Mic className="size-4" />
										)}
										{micFull && <span>{micLabel}</span>}
									</Button>
								</span>
							)}
							{(hasTranscript || !voiceEnabled) && (
								<Button
									onClick={handleRefine}
									disabled={refining || !hasTranscript}
									className="h-10 flex-1 gap-2 rounded-lg text-sm"
								>
									{refining ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Wand2 className="size-4" />
									)}
									{refining ? t('ext.teach.refining') : t('ext.teach.refine')}
								</Button>
							)}
						</div>
					</div>
				</>
			) : (
				<>
					<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
						<p className="text-sm text-muted-foreground">{t('ext.teach.review')}</p>
						<div className="rounded-md border border-border p-3">
							<SkillEditor
								skill={draft}
								onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
							/>
						</div>
					</div>
					<div className="flex shrink-0 justify-end gap-2 px-4 pb-4">
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
	)
}
