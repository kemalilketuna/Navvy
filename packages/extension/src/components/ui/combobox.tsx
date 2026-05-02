import { Check, ChevronDown, ImageIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

export interface ComboboxOption {
	value: string
	label?: string
	icon?: 'image' | null
}

interface ComboboxProps {
	value: string
	onChange: (next: string) => void
	options: ComboboxOption[]
	placeholder?: string
	disabled?: boolean
	id?: string
	allowCustom?: boolean
	emptyText?: string
	className?: string
}

export function Combobox({
	value,
	onChange,
	options,
	placeholder,
	disabled,
	id,
	allowCustom = true,
	emptyText,
	className,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false)
	const [query, setQuery] = React.useState('')
	const [activeIdx, setActiveIdx] = React.useState(0)
	const [dropUp, setDropUp] = React.useState(false)
	const rootRef = React.useRef<HTMLDivElement>(null)
	const inputRef = React.useRef<HTMLInputElement>(null)
	const listRef = React.useRef<HTMLDivElement>(null)

	React.useEffect(() => {
		if (!open) return
		const onDocClick = (e: MouseEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', onDocClick)
		return () => document.removeEventListener('mousedown', onDocClick)
	}, [open])

	React.useEffect(() => {
		if (open) setActiveIdx(0)
	}, [query, open])

	const display = open ? query : value
	const filtered = React.useMemo(() => {
		const q = (open ? query : '').trim().toLowerCase()
		if (!q) return options
		return options.filter((o) => {
			const hay = `${o.value} ${o.label ?? ''}`.toLowerCase()
			return hay.includes(q)
		})
	}, [options, query, open])

	// Flip the list above the input when there isn't room for it below.
	React.useLayoutEffect(() => {
		if (!open || !inputRef.current) return
		const rect = inputRef.current.getBoundingClientRect()
		const menuHeight = listRef.current?.offsetHeight ?? 0
		const spaceBelow = window.innerHeight - rect.bottom
		const spaceAbove = rect.top
		setDropUp(spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow)
	}, [open, filtered.length])

	const commit = (next: string) => {
		onChange(next)
		setOpen(false)
		setQuery('')
		inputRef.current?.blur()
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'ArrowDown') {
			if (!open) setOpen(true)
			setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
			e.preventDefault()
		} else if (e.key === 'ArrowUp') {
			setActiveIdx((i) => Math.max(0, i - 1))
			e.preventDefault()
		} else if (e.key === 'Enter') {
			if (open && filtered[activeIdx]) {
				commit(filtered[activeIdx].value)
			} else if (allowCustom && query.trim()) {
				commit(query.trim())
			}
			e.preventDefault()
		} else if (e.key === 'Escape') {
			setOpen(false)
			setQuery('')
		}
	}

	return (
		<div ref={rootRef} className={cn('relative', className)}>
			<div className="relative">
				<input
					ref={inputRef}
					id={id}
					type="text"
					role="combobox"
					aria-expanded={open}
					aria-autocomplete="list"
					autoComplete="off"
					value={display}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(e) => {
						setQuery(e.target.value)
						if (!open) setOpen(true)
					}}
					onFocus={() => !disabled && setOpen(true)}
					onKeyDown={handleKeyDown}
					className={cn(
						'h-9 w-full min-w-0 rounded-md border border-input bg-transparent pl-3 pr-9 text-base md:text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
					)}
				/>
				<button
					type="button"
					tabIndex={-1}
					disabled={disabled}
					onClick={() => {
						if (disabled) return
						setOpen((o) => !o)
						inputRef.current?.focus()
					}}
					className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
					aria-label="Toggle options"
				>
					<ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
				</button>
			</div>

			{open && (
				<div
					ref={listRef}
					className={cn(
						'absolute z-50 w-full max-h-64 overflow-auto rounded-md border border-input bg-popover text-popover-foreground shadow-md',
						dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
					)}
					role="listbox"
				>
					{filtered.length === 0 ? (
						<div className="px-3 py-2 text-xs text-muted-foreground">
							{allowCustom && query.trim()
								? `Press Enter to use "${query.trim()}"`
								: emptyText ?? 'No options'}
						</div>
					) : (
						filtered.map((opt, i) => {
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
									<span className="flex-1 truncate font-mono text-xs">
										{opt.label ?? opt.value}
									</span>
									{opt.icon === 'image' && (
										<ImageIcon
											className="size-3.5 shrink-0 text-muted-foreground"
											aria-label="Supports image input"
										/>
									)}
								</div>
							)
						})
					)}
				</div>
			)}
		</div>
	)
}
