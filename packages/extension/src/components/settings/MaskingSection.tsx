import { Eye, EyeOff, Plus, Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { type MaskingEntry, newMaskingId } from '@/agent/masking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/lib/i18n'

interface MaskingSectionProps {
	entries: MaskingEntry[]
	onChange: (entries: MaskingEntry[]) => void
}

const ADDRESS_TEMPLATE: Pick<MaskingEntry, 'token' | 'label'>[] = [
	{ token: 'addr_street', label: 'Street' },
	{ token: 'addr_city', label: 'City' },
	{ token: 'addr_state', label: 'State / Province' },
	{ token: 'addr_zip', label: 'Postal code' },
	{ token: 'addr_country', label: 'Country' },
]

function makeEntry(partial: Partial<MaskingEntry>): MaskingEntry {
	return {
		id: newMaskingId(),
		token: '',
		label: '',
		value: '',
		enabled: true,
		sensitive: false,
		...partial,
	}
}

export function MaskingSection({ entries, onChange }: MaskingSectionProps) {
	const t = useT()
	const [revealed, setRevealed] = useState<Set<string>>(() => new Set())

	const update = (id: string, patch: Partial<MaskingEntry>) => {
		onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
	}
	const remove = (id: string) => onChange(entries.filter((e) => e.id !== id))
	const add = () => onChange([...entries, makeEntry({})])
	const addAddressGroup = () => {
		const group = t('ext.masking.addressGroupName')
		onChange([
			...entries,
			...ADDRESS_TEMPLATE.map((f) => makeEntry({ ...f, group, sensitive: false })),
		])
	}

	const toggleReveal = (id: string) => {
		setRevealed((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	return (
		<div className="flex flex-col gap-6 max-w-2xl">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-base font-semibold">{t('ext.masking.title')}</h2>
				<p className="text-sm text-muted-foreground">{t('ext.masking.description')}</p>
			</div>

			<div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
				<Shield className="size-4 shrink-0 mt-0.5" />
				<div className="flex flex-col gap-1">
					<span>{t('ext.masking.unencryptedNote')}</span>
					<span>{t('ext.masking.jsDisabledNote')}</span>
				</div>
			</div>

			{entries.length === 0 ? (
				<p className="text-sm text-muted-foreground">{t('ext.masking.empty')}</p>
			) : (
				<div className="flex flex-col gap-4">
					{entries.map((entry) => {
						const isRevealed = revealed.has(entry.id)
						return (
							<div
								key={entry.id}
								className="flex flex-col gap-3 rounded-md border border-border p-3"
							>
								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-medium text-muted-foreground">
											{t('ext.masking.label')}
										</label>
										<Input
											value={entry.label}
											placeholder={t('ext.masking.labelPlaceholder')}
											onChange={(e) => update(entry.id, { label: e.target.value })}
											className="h-9 text-sm"
										/>
									</div>
									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-medium text-muted-foreground">
											{t('ext.masking.token')}
										</label>
										<Input
											value={entry.token}
											placeholder={t('ext.masking.tokenPlaceholder')}
											onChange={(e) =>
												update(entry.id, {
													token: e.target.value.replace(/[^\w.-]/g, '_'),
												})
											}
											className="h-9 text-sm font-mono"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-medium text-muted-foreground">
											{t('ext.masking.value')}
										</label>
										<div className="relative">
											<Input
												type={entry.sensitive && !isRevealed ? 'password' : 'text'}
												value={entry.value}
												placeholder={t('ext.masking.valuePlaceholder')}
												onChange={(e) => update(entry.id, { value: e.target.value })}
												className="h-9 text-sm pr-9"
											/>
											{entry.sensitive && (
												<button
													type="button"
													onClick={() => toggleReveal(entry.id)}
													className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
													aria-label={
														isRevealed ? t('ext.masking.hideValue') : t('ext.masking.showValue')
													}
												>
													{isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
												</button>
											)}
										</div>
									</div>
									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-medium text-muted-foreground">
											{t('ext.masking.group')}
										</label>
										<Input
											value={entry.group ?? ''}
											placeholder={t('ext.masking.groupPlaceholder')}
											onChange={(e) => update(entry.id, { group: e.target.value || undefined })}
											className="h-9 text-sm"
										/>
									</div>
								</div>

								<div className="flex items-center justify-between gap-4">
									<label className="flex items-center gap-2 cursor-pointer text-sm">
										<Switch
											checked={entry.sensitive}
											onCheckedChange={(checked) => update(entry.id, { sensitive: checked })}
										/>
										<span>{t('ext.masking.sensitive')}</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer text-sm">
										<Switch
											checked={entry.enabled}
											onCheckedChange={(checked) => update(entry.id, { enabled: checked })}
										/>
										<span>{t('ext.masking.enabled')}</span>
									</label>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => remove(entry.id)}
										className="ml-auto text-muted-foreground hover:text-destructive"
										aria-label={t('ext.masking.delete')}
										title={t('ext.masking.delete')}
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">{t('ext.masking.sensitiveHelp')}</p>
							</div>
						)
					})}
				</div>
			)}

			<div className="flex gap-2">
				<Button variant="outline" onClick={add}>
					<Plus className="size-4" />
					{t('ext.masking.addEntry')}
				</Button>
				<Button variant="outline" onClick={addAddressGroup}>
					<Plus className="size-4" />
					{t('ext.masking.addAddressGroup')}
				</Button>
			</div>
		</div>
	)
}
