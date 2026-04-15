import type {
	AgentActivity,
	AgentErrorEvent,
	AgentStepEvent,
	HistoricalEvent,
	ObservationEvent,
	RetryEvent,
} from '@page-agent/core'
import {
	BrainCircuit,
	ChevronRight,
	CircleCheck,
	CircleDot,
	Eye,
	Globe,
	Keyboard,
	Mouse,
	MoveVertical,
	RefreshCw,
	Target,
	XCircle,
	Zap,
} from 'lucide-react'
import { motion } from 'motion/react'
import { type CSSProperties, type ReactNode, useState } from 'react'

import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Shimmer applied to running activity labels — gradient slides across the
// text so the running state visually breathes (borrowed from browser-agent
// StepList).
const SHIMMER_STYLE: CSSProperties = {
	backgroundImage:
		'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.35), rgba(255,255,255,0.95))',
	backgroundSize: '200% 100%',
	WebkitBackgroundClip: 'text',
	backgroundClip: 'text',
	color: 'transparent',
}

function EventEnter({ children }: { children: ReactNode }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: 'easeOut' }}
		>
			{children}
		</motion.div>
	)
}

function ActionIcon({ name, className }: { name: string; className?: string }) {
	const icons: Record<string, ReactNode> = {
		click_element_by_index: <Mouse className={className} />,
		input: <Keyboard className={className} />,
		scroll: <MoveVertical className={className} />,
		go_to_url: <Globe className={className} />,
		open_new_tab: <Globe className={className} />,
	}
	return icons[name] || <Zap className={className} />
}

function extractPrompt(rawRequest: unknown, role: 'system' | 'user'): string | null {
	const messages = (rawRequest as { messages?: { role: string; content?: unknown }[] })?.messages
	if (!messages || !Array.isArray(messages)) return null
	const msg =
		role === 'system'
			? messages.find((m) => m.role === role)
			: messages.findLast((m) => m.role === role)
	if (!msg?.content) return null
	return typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)
}

function CopyButton({ text, label }: { text: string; label: string }) {
	const t = useT()
	const [copied, setCopied] = useState(false)
	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard.writeText(text)
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			}}
			className="cursor-pointer rounded border border-white/10 px-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
		>
			{copied ? t('ext.cards.copied') : label}
		</button>
	)
}

// Collapsible Raw section — hidden by default behind a small disclosure
// row to keep the message stream clean.
function RawDetails({ rawRequest, rawResponse }: { rawRequest?: unknown; rawResponse?: unknown }) {
	const t = useT()
	const [open, setOpen] = useState(false)
	const [tab, setTab] = useState<'request' | 'response'>(rawRequest ? 'request' : 'response')

	if (!rawRequest && !rawResponse) return null

	const content = tab === 'request' ? rawRequest : rawResponse
	const systemPrompt = tab === 'request' ? extractPrompt(rawRequest, 'system') : null
	const userPrompt = tab === 'request' ? extractPrompt(rawRequest, 'user') : null

	return (
		<div className="mt-1.5">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronRight
					className={cn('size-3 transition-transform', open && 'rotate-90')}
					aria-hidden="true"
				/>
				<span>{open ? 'Hide details' : 'Show details'}</span>
			</button>
			{open && (
				<div className="mt-1.5 space-y-1.5">
					<div className="flex items-center gap-3">
						{rawRequest != null && (
							<button
								type="button"
								onClick={() => setTab('request')}
								className={cn(
									'text-[10px] transition-colors',
									tab === 'request'
										? 'text-foreground underline underline-offset-2'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								{t('ext.cards.rawRequest')}
							</button>
						)}
						{rawResponse != null && (
							<button
								type="button"
								onClick={() => setTab('response')}
								className={cn(
									'text-[10px] transition-colors',
									tab === 'response'
										? 'text-foreground underline underline-offset-2'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								{t('ext.cards.rawResponse')}
							</button>
						)}
					</div>
					{content != null && (
						<div className="relative">
							<div className="absolute right-1 top-1 flex gap-1">
								{systemPrompt && (
									<CopyButton text={systemPrompt} label={t('ext.cards.copySystem')} />
								)}
								{userPrompt && <CopyButton text={userPrompt} label={t('ext.cards.copyUser')} />}
								<CopyButton text={JSON.stringify(content, null, 4)} label={t('ext.cards.copy')} />
							</div>
							<pre className="max-h-60 overflow-auto rounded border border-white/5 bg-neutral-950/60 p-2 pt-5 text-[10px] text-foreground/70">
								{JSON.stringify(content, null, 4)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

// One reflection bullet — a tiny icon + clamped text the user can expand
// by clicking. Indent comes from the parent grid.
function ReflectionRow({ icon, value }: { icon: ReactNode; value: string }) {
	const [expanded, setExpanded] = useState(false)
	return (
		<>
			<span className="mt-0.5 text-muted-foreground">{icon}</span>
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className={cn(
					'text-left text-[12px] leading-snug text-foreground/80 transition-colors hover:text-foreground',
					!expanded && 'line-clamp-1'
				)}
			>
				{value}
			</button>
		</>
	)
}

function ReflectionSection({
	reflection,
}: {
	reflection: { evaluation_previous_goal?: string; memory?: string; next_goal?: string }
}) {
	const items = [
		{
			key: 'eval',
			icon: <CircleCheck className="size-3" />,
			value: reflection.evaluation_previous_goal,
		},
		{
			key: 'memory',
			icon: <BrainCircuit className="size-3" />,
			value: reflection.memory,
		},
		{
			key: 'goal',
			icon: <Target className="size-3" />,
			value: reflection.next_goal,
		},
	].filter((i) => i.value)

	if (items.length === 0) return null

	return (
		<div className="grid grid-cols-[14px_1fr] gap-x-2 gap-y-1.5">
			{items.map((item) => (
				<ReflectionRow key={item.key} icon={item.icon} value={item.value!} />
			))}
		</div>
	)
}

// Single step rendered as a Claude-Code-style timeline entry: thin left
// rail, tiny step label, reflection bullets, then a single action row with
// an indented output. No card chrome.
function StepCard({
	event,
	children,
	isActive = false,
}: {
	event: AgentStepEvent
	children?: ReactNode
	isActive?: boolean
}) {
	const [open, setOpen] = useState(false)
	const summary =
		compactText(event.reflection?.next_goal) ||
		compactText(event.reflection?.memory) ||
		compactText(event.reflection?.evaluation_previous_goal) ||
		compactText(event.action?.output) ||
		event.action?.name ||
		''

	return (
		<div className="relative pl-3.5 rounded-md transition-colors hover:bg-white/[0.025]">
			<span aria-hidden="true" className="absolute left-0 top-1 bottom-1 w-px bg-white/10" />
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-start gap-2 py-1 text-left"
				aria-expanded={open}
			>
				<ChevronRight
					className={cn(
						'mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform',
						open && 'rotate-90'
					)}
					aria-hidden="true"
				/>
				<div className="min-w-0 flex-1">
					<div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
						Step {(event.stepIndex ?? 0) + 1}
					</div>
					<motion.div
						className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground/85"
						animate={isActive ? { backgroundPosition: ['-200% 0', '200% 0'] } : undefined}
						transition={
							isActive
								? { repeat: Number.POSITIVE_INFINITY, duration: 1.9, ease: 'linear' }
								: undefined
						}
						style={isActive ? SHIMMER_STYLE : undefined}
					>
						{summary}
					</motion.div>
				</div>
			</button>

			{open && (
				<div className="pb-1 pl-5">
					{event.reflection && (
						<div className="mb-1.5">
							<ReflectionSection reflection={event.reflection} />
						</div>
					)}

					{event.action && (
						<div className="space-y-0.5 text-[12px] leading-snug">
							<div className="flex items-start gap-2">
								<ActionIcon
									name={event.action.name}
									className="mt-0.5 size-3 shrink-0 text-blue-400"
								/>
								<div className="min-w-0 flex-1">
									<span className="font-mono text-foreground">{event.action.name}</span>
									{event.action.name !== 'done' && (
										<span className="ml-1.5 break-all font-mono text-[11px] text-muted-foreground/80">
											{JSON.stringify(event.action.input)}
										</span>
									)}
								</div>
							</div>
							{event.action.output && (
								<div className="ml-5 flex items-start gap-1 text-[11px] text-muted-foreground">
									<span aria-hidden="true" className="select-none text-muted-foreground/60">
										⎿
									</span>
									<span className="break-all">{event.action.output}</span>
								</div>
							)}
						</div>
					)}

					{children}

					<RawDetails rawRequest={event.rawRequest} rawResponse={event.rawResponse} />
				</div>
			)}
		</div>
	)
}

function ObservationCard({ event }: { event: ObservationEvent }) {
	return (
		<div className="flex items-start gap-2 pl-3.5 text-[12px] text-muted-foreground">
			<Eye className="mt-0.5 size-3 shrink-0 text-emerald-400" />
			<span className="break-all">{event.content}</span>
		</div>
	)
}

function RetryCard({ event }: { event: RetryEvent }) {
	return (
		<div className="flex items-start gap-2 pl-3.5 text-[12px] text-amber-400">
			<RefreshCw className="mt-0.5 size-3 shrink-0" />
			<span>
				{event.message}{' '}
				<span className="text-muted-foreground/80">
					({event.attempt}/{event.maxAttempts})
				</span>
			</span>
		</div>
	)
}

function ErrorCard({ event }: { event: AgentErrorEvent }) {
	return (
		<div className="pl-3.5">
			<div className="flex items-start gap-2 text-[12px] text-destructive">
				<XCircle className="mt-0.5 size-3 shrink-0" />
				<span className="break-all">{event.message}</span>
			</div>
			<div className="ml-5">
				<RawDetails rawResponse={event.rawResponse} />
			</div>
		</div>
	)
}

function ResultRow({ success, text }: { success: boolean; text: string }) {
	const t = useT()
	return (
		<div className="pl-3.5">
			<div className="flex items-start gap-2 text-[12px]">
				{success ? (
					<CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
				) : (
					<XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
				)}
				<div className="min-w-0 flex-1">
					<div className={cn('font-medium', success ? 'text-emerald-400' : 'text-destructive')}>
						{success ? t('ext.cards.resultSuccess') : t('ext.cards.resultFailed')}
					</div>
					{text && <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">{text}</p>}
				</div>
			</div>
		</div>
	)
}

function compactText(value: unknown): string {
	if (value == null) return ''
	if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim()
	return JSON.stringify(value).replace(/\s+/g, ' ').trim()
}

function isPendingActivity(activity: AgentActivity | null | undefined): boolean {
	return (
		activity?.type === 'thinking' || activity?.type === 'executing' || activity?.type === 'retrying'
	)
}

export function HistoryStream({
	history,
	activity,
}: {
	history: HistoricalEvent[]
	activity?: AgentActivity | null
}) {
	const latestStepIndex = history.findLastIndex((event) => event.type === 'step')
	const shouldShimmerLatestStep = isPendingActivity(activity)

	return (
		<>
			{history.map((event, index) => (
				<EventCard
					key={index}
					event={event}
					isActiveStep={shouldShimmerLatestStep && index === latestStepIndex}
				/>
			))}
			{activity && <ActivityCard activity={activity} />}
		</>
	)
}

// Top-level dispatcher.
export function EventCard({
	event,
	isActiveStep = false,
}: {
	event: HistoricalEvent
	isActiveStep?: boolean
}) {
	if (event.type === 'step' && event.action?.name === 'done') {
		const input = event.action.input as { text?: string; success?: boolean }
		return (
			<EventEnter>
				<StepCard event={event as AgentStepEvent} isActive={isActiveStep}>
					<ResultRow
						success={input?.success ?? true}
						text={input?.text || event.action.output || ''}
					/>
				</StepCard>
			</EventEnter>
		)
	}

	if (event.type === 'step') {
		return (
			<EventEnter>
				<StepCard event={event as AgentStepEvent} isActive={isActiveStep} />
			</EventEnter>
		)
	}

	if (event.type === 'observation') {
		return (
			<EventEnter>
				<ObservationCard event={event as ObservationEvent} />
			</EventEnter>
		)
	}

	if (event.type === 'retry') {
		return (
			<EventEnter>
				<RetryCard event={event as RetryEvent} />
			</EventEnter>
		)
	}

	if (event.type === 'error') {
		return (
			<EventEnter>
				<ErrorCard event={event as AgentErrorEvent} />
			</EventEnter>
		)
	}

	return null
}

// Activity indicator at the tail of the stream — small loader / sparkle
// with a shimmering label while the agent is pending. Mirrors the
// browser-agent PlanningIndicator visual.
export function ActivityCard({ activity }: { activity: AgentActivity }) {
	const t = useT()
	const getActivityInfo = () => {
		switch (activity.type) {
			case 'thinking':
				return { text: t('ext.activity.thinking'), color: 'text-blue-400' }
			case 'executing':
				return {
					text: t('ext.activity.executing', { tool: activity.tool }),
					color: 'text-amber-400',
				}
			case 'executed':
				return { text: t('ext.activity.done', { tool: activity.tool }), color: 'text-emerald-400' }
			case 'retrying':
				return {
					text: t('ext.activity.retrying', {
						attempt: activity.attempt,
						max: activity.maxAttempts,
					}),
					color: 'text-amber-400',
				}
			case 'error':
				return { text: activity.message, color: 'text-destructive' }
		}
	}

	const info = getActivityInfo()
	const isPending =
		activity.type === 'thinking' || activity.type === 'executing' || activity.type === 'retrying'

	return (
		<motion.div
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -4 }}
			transition={{ duration: 0.2 }}
			className="flex items-center gap-2 pl-3.5"
		>
			{activity.type === 'thinking' ? (
				<motion.div
					data-testid="thinking-spinner"
					className="size-3 shrink-0 rounded-full border-2 border-blue-400/70 border-t-transparent"
					animate={{ rotate: 360 }}
					transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
				/>
			) : activity.type === 'executed' ? (
				<CircleCheck className={cn('size-3 shrink-0', info.color)} />
			) : activity.type === 'error' ? (
				<XCircle className={cn('size-3 shrink-0', info.color)} />
			) : (
				<CircleDot className={cn('size-3 shrink-0', info.color)} />
			)}
			<motion.span
				className={cn('text-[12px]', !isPending && info.color)}
				animate={isPending ? { backgroundPosition: ['-200% 0', '200% 0'] } : undefined}
				transition={
					isPending
						? { repeat: Number.POSITIVE_INFINITY, duration: 1.8, ease: 'linear' }
						: undefined
				}
				style={isPending ? SHIMMER_STYLE : undefined}
			>
				{info.text}
			</motion.span>
		</motion.div>
	)
}
