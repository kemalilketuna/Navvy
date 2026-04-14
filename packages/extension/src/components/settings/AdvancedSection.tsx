import type { AdvancedConfig } from '@/agent/configStore'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/lib/i18n'

interface AdvancedSectionProps {
	value: AdvancedConfig
	onChange: (patch: Partial<AdvancedConfig>) => void
}

export function AdvancedSection({ value, onChange }: AdvancedSectionProps) {
	const t = useT()

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="max-steps" className="text-sm font-medium">
					{t('ext.config.maxSteps')}
				</label>
				<Input
					id="max-steps"
					type="number"
					placeholder="40"
					min={1}
					max={200}
					value={value.maxSteps ?? ''}
					onChange={(e) =>
						onChange({ maxSteps: e.target.value ? Number(e.target.value) : undefined })
					}
					className="text-sm h-9 max-w-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="system-instruction" className="text-sm font-medium">
					{t('ext.config.systemInstruction')}
				</label>
				<textarea
					id="system-instruction"
					placeholder={t('ext.config.systemInstructionPlaceholder')}
					value={value.systemInstruction ?? ''}
					onChange={(e) => onChange({ systemInstruction: e.target.value })}
					rows={5}
					className="text-sm rounded-md border border-input bg-background px-3 py-2 resize-y min-h-[100px]"
				/>
			</div>

			<label className="flex items-center justify-between cursor-pointer">
				<span className="text-sm">{t('ext.config.disableNamedToolChoice')}</span>
				<Switch
					checked={value.disableNamedToolChoice ?? false}
					onCheckedChange={(checked) => onChange({ disableNamedToolChoice: checked })}
				/>
			</label>

			<label className="flex items-center justify-between cursor-pointer">
				<span className="text-sm">{t('ext.config.expLlmsTxt')}</span>
				<Switch
					checked={value.experimentalLlmsTxt ?? false}
					onCheckedChange={(checked) => onChange({ experimentalLlmsTxt: checked })}
				/>
			</label>

			<label className="flex items-center justify-between cursor-pointer">
				<span className="text-sm">{t('ext.config.expIncludeAllTabs')}</span>
				<Switch
					checked={value.experimentalIncludeAllTabs ?? false}
					onCheckedChange={(checked) => onChange({ experimentalIncludeAllTabs: checked })}
				/>
			</label>
		</div>
	)
}
