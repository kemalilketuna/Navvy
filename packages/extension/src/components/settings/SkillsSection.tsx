import { Loader2, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { type RefineCredentials, refineSkill } from '@/agent/skillRefiner'
import { type Skill, newSkillId } from '@/agent/skills'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'

import { SkillEditor } from './SkillEditor'

interface SkillsSectionProps {
	skills: Skill[]
	onChange: (skills: Skill[]) => void
	llm: RefineCredentials
}

export function makeSkill(partial: Partial<Skill>): Skill {
	return {
		id: newSkillId(),
		name: '',
		description: '',
		urlPattern: '',
		triggerPhrases: [],
		parameters: [],
		plan: '',
		sourceTranscript: '',
		enabled: true,
		createdAt: Date.now(),
		...partial,
	}
}

export function SkillsSection({ skills, onChange, llm }: SkillsSectionProps) {
	const t = useT()
	const [transcript, setTranscript] = useState('')
	const [refiningNew, setRefiningNew] = useState(false)
	const [refiningId, setRefiningId] = useState<string | null>(null)

	const llmReady = Boolean(llm.baseURL && llm.model)

	const update = (id: string, patch: Partial<Skill>) =>
		onChange(skills.map((s) => (s.id === id ? { ...s, ...patch } : s)))
	const remove = (id: string) => onChange(skills.filter((s) => s.id !== id))
	const addBlank = () => onChange([...skills, makeSkill({})])

	const handleRefineNew = async () => {
		if (!transcript.trim()) {
			toast.warning(t('ext.skills.needNarration'))
			return
		}
		if (!llmReady) {
			toast.warning(t('ext.skills.refineNeedsLlm'))
			return
		}
		setRefiningNew(true)
		try {
			const refined = await refineSkill(llm, { transcript })
			onChange([...skills, makeSkill({ ...refined, sourceTranscript: transcript })])
			setTranscript('')
			toast.success(t('ext.skills.refined'))
		} catch (err) {
			toast.error(`${t('ext.skills.refineFailed')}: ${err instanceof Error ? err.message : err}`)
		} finally {
			setRefiningNew(false)
		}
	}

	const handleReRefine = async (skill: Skill) => {
		if (!skill.sourceTranscript.trim()) {
			toast.warning(t('ext.skills.noTranscript'))
			return
		}
		if (!llmReady) {
			toast.warning(t('ext.skills.refineNeedsLlm'))
			return
		}
		setRefiningId(skill.id)
		try {
			const refined = await refineSkill(llm, {
				transcript: skill.sourceTranscript,
				existing: {
					name: skill.name,
					description: skill.description,
					urlPattern: skill.urlPattern,
					parameters: skill.parameters,
					plan: skill.plan,
				},
			})
			update(skill.id, refined)
			toast.success(t('ext.skills.refined'))
		} catch (err) {
			toast.error(`${t('ext.skills.refineFailed')}: ${err instanceof Error ? err.message : err}`)
		} finally {
			setRefiningId(null)
		}
	}

	return (
		<div className="flex flex-col gap-6 max-w-2xl">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-base font-semibold">{t('ext.skills.title')}</h2>
				<p className="text-sm text-muted-foreground">{t('ext.skills.description')}</p>
			</div>

			<div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
				<Sparkles className="size-4 shrink-0 mt-0.5" />
				<span>{t('ext.skills.teachHint')}</span>
			</div>

			{/* Refine from text — the no-voice authoring path. */}
			<div className="flex flex-col gap-2 rounded-md border border-border p-3">
				<Label className="text-sm font-medium">{t('ext.skills.refineFromText')}</Label>
				<p className="text-xs text-muted-foreground">{t('ext.skills.refineHint')}</p>
				<Textarea
					value={transcript}
					onChange={(e) => setTranscript(e.target.value)}
					placeholder={t('ext.skills.transcriptPlaceholder')}
					className="min-h-20 text-sm"
				/>
				<div className="flex justify-end">
					<Button onClick={handleRefineNew} disabled={refiningNew || !transcript.trim()}>
						{refiningNew ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Wand2 className="size-4" />
						)}
						{refiningNew ? t('ext.skills.refining') : t('ext.skills.refine')}
					</Button>
				</div>
			</div>

			{skills.length === 0 ? (
				<p className="text-sm text-muted-foreground">{t('ext.skills.empty')}</p>
			) : (
				<div className="flex flex-col gap-4">
					{skills.map((skill) => (
						<div key={skill.id} className="flex flex-col gap-3 rounded-md border border-border p-3">
							<SkillEditor skill={skill} onChange={(patch) => update(skill.id, patch)} />

							<div className="flex items-center justify-between gap-4">
								<label className="flex items-center gap-2 cursor-pointer text-sm">
									<Switch
										checked={skill.enabled}
										onCheckedChange={(checked) => update(skill.id, { enabled: checked })}
									/>
									<span>{t('ext.skills.enabled')}</span>
								</label>
								{skill.sourceTranscript.trim() && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleReRefine(skill)}
										disabled={refiningId === skill.id}
										className="text-muted-foreground"
									>
										{refiningId === skill.id ? (
											<Loader2 className="size-3.5 animate-spin" />
										) : (
											<Wand2 className="size-3.5" />
										)}
										{t('ext.skills.reRefine')}
									</Button>
								)}
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => remove(skill.id)}
									className="ml-auto text-muted-foreground hover:text-destructive"
									aria-label={t('ext.skills.delete')}
									title={t('ext.skills.delete')}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<div>
				<Button variant="outline" onClick={addBlank}>
					<Plus className="size-4" />
					{t('ext.skills.add')}
				</Button>
			</div>
		</div>
	)
}
