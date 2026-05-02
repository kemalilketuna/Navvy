import { Plus, Trash2 } from 'lucide-react'

import { type ParamSpec, type ParamType, type Skill, slugify } from '@/agent/skills'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'

const PARAM_TYPE_OPTIONS: { value: ParamType; label: string }[] = [
	{ value: 'string', label: 'string' },
	{ value: 'number', label: 'number' },
	{ value: 'boolean', label: 'boolean' },
]

type EditableSkill = Pick<Skill, 'name' | 'description' | 'urlPattern' | 'parameters' | 'plan'>

interface SkillEditorProps {
	skill: EditableSkill
	onChange: (patch: Partial<EditableSkill>) => void
}

/** Editable structured fields of a skill, shared by Settings and the Teach review card. */
export function SkillEditor({ skill, onChange }: SkillEditorProps) {
	const t = useT()

	const updateParam = (index: number, patch: Partial<ParamSpec>) =>
		onChange({ parameters: skill.parameters.map((p, i) => (i === index ? { ...p, ...patch } : p)) })
	const addParam = () =>
		onChange({
			parameters: [
				...skill.parameters,
				{ name: '', type: 'string', description: '', required: true },
			],
		})
	const removeParam = (index: number) =>
		onChange({ parameters: skill.parameters.filter((_, i) => i !== index) })

	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted-foreground">
						{t('ext.skills.name')}
					</label>
					<Input
						value={skill.name}
						placeholder={t('ext.skills.namePlaceholder')}
						onChange={(e) => onChange({ name: slugify(e.target.value) })}
						className="h-9 text-sm font-mono"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted-foreground">
						{t('ext.skills.urlPattern')}
					</label>
					<Input
						value={skill.urlPattern}
						placeholder={t('ext.skills.urlPatternPlaceholder')}
						onChange={(e) => onChange({ urlPattern: e.target.value })}
						className="h-9 text-sm font-mono"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-medium text-muted-foreground">
					{t('ext.skills.skillDescription')}
				</label>
				<Input
					value={skill.description}
					placeholder={t('ext.skills.skillDescriptionPlaceholder')}
					onChange={(e) => onChange({ description: e.target.value })}
					className="h-9 text-sm"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-medium text-muted-foreground">{t('ext.skills.plan')}</label>
				<Textarea
					value={skill.plan}
					placeholder={t('ext.skills.planPlaceholder')}
					onChange={(e) => onChange({ plan: e.target.value })}
					className="min-h-24 text-sm"
				/>
			</div>

			<div className="flex flex-col gap-2">
				<label className="text-xs font-medium text-muted-foreground">
					{t('ext.skills.parameters')}
				</label>
				{skill.parameters.map((param, i) => (
					<div key={i} className="flex items-center gap-2">
						<Input
							value={param.name}
							placeholder={t('ext.skills.paramName')}
							onChange={(e) => updateParam(i, { name: e.target.value.replace(/\s+/g, '_') })}
							className="h-8 w-28 text-sm font-mono"
						/>
						<Select
							value={param.type}
							onChange={(value) => updateParam(i, { type: value as ParamType })}
							options={PARAM_TYPE_OPTIONS}
							aria-label={t('ext.skills.parameters')}
							className="w-24"
						/>
						<Input
							value={param.description}
							placeholder={t('ext.skills.paramDescription')}
							onChange={(e) => updateParam(i, { description: e.target.value })}
							className="h-8 flex-1 text-sm"
						/>
						<label
							className="flex items-center gap-1 text-xs text-muted-foreground"
							title={t('ext.skills.paramRequired')}
						>
							<Switch
								checked={param.required}
								onCheckedChange={(checked) => updateParam(i, { required: checked })}
							/>
						</label>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => removeParam(i)}
							className="text-muted-foreground hover:text-destructive"
							aria-label={t('ext.skills.removeParam')}
							title={t('ext.skills.removeParam')}
						>
							<Trash2 className="size-3.5" />
						</Button>
					</div>
				))}
				<Button variant="outline" size="sm" onClick={addParam} className="self-start">
					<Plus className="size-3.5" />
					{t('ext.skills.addParam')}
				</Button>
			</div>
		</div>
	)
}
