import { Motion } from 'ai-motion'
import { useEffect, useRef } from 'react'

import type { ExtStatus } from '@/agent/useAgent'
import { TypingAnimation } from '@/components/ui/typing-animation'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Status dot indicator
export function StatusDot({ status }: { status: ExtStatus }) {
	const t = useT()
	const colorClass = {
		idle: 'bg-green-500',
		running: 'bg-blue-500',
		completed: 'bg-green-500',
		error: 'bg-destructive',
		stopped: 'bg-amber-500',
	}[status]

	const label = {
		idle: t('ext.status.ready'),
		running: t('ext.status.running'),
		completed: t('ext.status.completed'),
		error: t('ext.status.error'),
		stopped: t('ext.status.stopped'),
	}[status]

	return (
		<div className="flex items-center gap-1.5 ml-2 mr-2">
			<span
				className={cn('size-2 rounded-full', colorClass, status === 'running' && 'animate-pulse')}
			/>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	)
}

export function Logo({ className }: { className?: string }) {
	return <img src="/logo.svg" alt="Navvy" className={cn('', className)} />
}

// Full-screen ai-motion glow overlay, shown only while running
export function MotionOverlay({ active }: { active: boolean }) {
	const containerRef = useRef<HTMLDivElement>(null)
	const motionRef = useRef<Motion | null>(null)

	useEffect(() => {
		try {
			const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
			const motion = new Motion({
				mode,
				borderWidth: 4,
				borderRadius: 14,
				glowWidth: mode === 'dark' ? 120 : 60,
				styles: { position: 'absolute', inset: '0' },
			})
			motionRef.current = motion
			containerRef.current!.appendChild(motion.element)
			motion.autoResize(containerRef.current!)
		} catch (e) {
			console.warn('[MotionOverlay] Motion unavailable:', e)
		}

		return () => {
			motionRef.current?.dispose()
			motionRef.current = null
		}
	}, [])

	useEffect(() => {
		const motion = motionRef.current
		if (!motion) return

		let disposed = false
		if (active) {
			motion.start()
			motion.fadeIn()
		} else {
			motion.fadeOut().then(() => !disposed && motion.pause())
		}
		return () => {
			disposed = true
		}
	}, [active])

	return (
		<div
			ref={containerRef}
			className="pointer-events-none absolute inset-0 z-10 opacity-75 overflow-hidden"
			style={{ display: active ? undefined : 'none' }}
		/>
	)
}

// Empty state: wordmark + typing slogan
export function EmptyState() {
	const t = useT()
	return (
		<div className="relative isolate flex h-full flex-col items-center justify-center gap-4 overflow-hidden px-6 text-center">
			<div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-72 -translate-x-1/2 translate-y-[-58%] text-[#E8C789] opacity-100">
				<div className="absolute inset-10 rounded-full border border-current/10" />
				<div className="absolute inset-16 rounded-full border border-current/10 border-dashed" />
				<svg
					viewBox="0 0 128 128"
					aria-hidden="true"
					className="absolute left-1/2 top-1/2 size-70 -translate-x-1/2 -translate-y-1/2 -rotate-12 drop-shadow-[0_18px_42px_rgba(232,199,137,0.12)]"
				>
					<path
						d="M44 42 L88 58 L66 66 L58 90 Z"
						fill="currentColor"
						stroke="currentColor"
						strokeWidth="4"
						strokeLinejoin="round"
						className="opacity-[0.13]"
					/>
					<path
						d="M44 42 L88 58 L66 66 L58 90 Z"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinejoin="round"
						className="opacity-25"
					/>
				</svg>
			</div>
			<div className="relative flex flex-col items-center gap-1">
				<h2 className="text-3xl font-semibold tracking-tight bg-linear-to-b from-foreground via-foreground/90 to-foreground/55 bg-clip-text text-transparent">
					Navvy
				</h2>
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Browser agent</p>
			</div>
			<TypingAnimation
				className="text-sm text-muted-foreground max-w-xs"
				words={[t('ext.empty.tip1'), t('ext.empty.tip2'), t('ext.empty.tip3'), t('ext.empty.tip4')]}
				cursorStyle="underscore"
				loop
				startOnView={false}
				typeSpeed={20}
				deleteSpeed={10}
				pauseDelay={3000}
			/>
		</div>
	)
}
