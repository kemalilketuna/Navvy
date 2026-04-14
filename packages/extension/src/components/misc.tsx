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
		<div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
			<div className="flex flex-col items-center gap-1">
				<h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
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
