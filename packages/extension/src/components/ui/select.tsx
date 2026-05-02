import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SelectOption {
	value: string
	label: string
}

interface SelectProps {
	value: string
	onChange: (next: string) => void
	options: SelectOption[]
	placeholder?: string
	disabled?: boolean
	id?: string
	className?: string
	'aria-label'?: string
}

export function Select({
	value,
	onChange,
	options,
	placeholder,
	disabled,
	id,
	className,
	'aria-label': ariaLabel,
}: SelectProps) {
	const [open, setOpen] = React.useState(false)
	const [activeIdx, setActiveIdx] = React.useState(0)
	const [dropUp, setDropUp] = React.useState(false)
	const rootRef = React.useRef<HTMLDivElement>(null)
	const triggerRef = React.useRef<HTMLButtonElement>(null)
	const menuRef = React.useRef<HTMLDivElement>(null)

	const selected = options.find((o) => o.value === value)
	const selectedIdx = Math.max(
		0,
		options.findIndex((o) => o.value === value)
	)

	React.useEffect(() => {
		if (!open) return
		setActiveIdx(selectedIdx)
		const onDocClick = (e: MouseEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', onDocClick)
		return () => document.removeEventListener('mousedown', onDocClick)
	}, [open, selectedIdx])

	// Flip the menu above the trigger when there isn't room for it below.
	React.useLayoutEffect(() => {
		if (!open || !triggerRef.current) return
		const rect = triggerRef.current.getBoundingClientRect()
		const menuHeight = menuRef.current?.offsetHeight ?? 0
		const spaceBelow = window.innerHeight - rect.bottom
		const spaceAbove = rect.top
		setDropUp(spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow)
	}, [open])

	const commit = (next: string) => {
		onChange(next)
		setOpen(false)
		triggerRef.current?.focus()
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === 'ArrowDown') {
			if (!open) setOpen(true)
			else setActiveIdx((i) => Math.min(options.length - 1, i + 1))
			e.preventDefault()
		} else if (e.key === 'ArrowUp') {
			if (!open) setOpen(true)
			else setActiveIdx((i) => Math.max(0, i - 1))
			e.preventDefault()
		} else if (e.key === 'Enter' || e.key === ' ') {
			if (open && options[activeIdx]) {
				commit(options[activeIdx].value)
			} else {
				setOpen(true)
			}
			e.preventDefault()
		} else if (e.key === 'Escape') {
			setOpen(false)
		}
	}

	return (
		<div ref={rootRef} className={cn('relative', className)}>
			<button
				ref={triggerRef}
				type="button"
				id={id}
				role="combobox"
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-label={ariaLabel}
				disabled={disabled}
				onClick={() => !disabled && setOpen((o) => !o)}
				onKeyDown={handleKeyDown}
				className={cn(
					'flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-transparent pl-3 pr-2 text-base md:text-sm shadow-xs outline-none transition-[color,box-shadow] cursor-pointer',
					'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
					'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
					!selected && 'text-muted-foreground'
				)}
			>
				<span className="truncate">{selected?.label ?? placeholder ?? ''}</span>
				<ChevronDown
					className={cn(
						'size-4 shrink-0 text-muted-foreground transition-transform',
						open && 'rotate-180'
					)}
				/>
			</button>

			{open && (
				<div
					ref={menuRef}
					className={cn(
						'absolute z-50 w-full max-h-64 overflow-auto rounded-md border border-input bg-popover text-popover-foreground shadow-md',
						dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
					)}
					role="listbox"
				>
					{options.map((opt, i) => {
						const isActive = i === activeIdx
						const isSelected = opt.value === value
						return (
							<div
								key={opt.value}
								role="option"
								aria-selected={isSelected}
								onMouseDown={(e) => {
									e.preventDefault()
									commit(opt.value)
								}}
								onMouseEnter={() => setActiveIdx(i)}
								className={cn(
									'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer',
									isActive && 'bg-accent text-accent-foreground'
								)}
							>
								<Check
									className={cn(
										'size-3.5 shrink-0',
										isSelected ? 'opacity-100' : 'opacity-0'
									)}
								/>
								<span className="flex-1 truncate">{opt.label}</span>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
