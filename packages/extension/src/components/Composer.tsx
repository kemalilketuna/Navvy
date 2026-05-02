import type { TaskAttachment } from '@page-agent/core'
import { ArrowUp, Camera, ImagePlus, Loader2, Mic, Plus, Square, X } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, forwardRef, useRef } from 'react'
import { toast } from 'sonner'

import type { VoiceState } from '@/agent/useAgent'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface ComposerProps {
	readonly value: string
	readonly onChange: (value: string) => void
	readonly onSubmit: () => void
	readonly onStop: () => void
	readonly isRunning: boolean
	readonly attachments: TaskAttachment[]
	readonly onAttachmentsChange: (next: TaskAttachment[]) => void
	readonly modelSupportsImages: boolean
	readonly voiceEnabled: boolean
	readonly voiceState: VoiceState
	readonly onMicToggle: () => void
}

async function captureActiveTab(): Promise<string> {
	const window = await chrome.windows.getCurrent()
	return chrome.tabs.captureVisibleTab(window.id!, { format: 'png' })
}

function readFileAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
		reader.readAsDataURL(file)
	})
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
	{
		value,
		onChange,
		onSubmit,
		onStop,
		isRunning,
		attachments,
		onAttachmentsChange,
		modelSupportsImages,
		voiceEnabled,
		voiceState,
		onMicToggle,
	},
	ref
) {
	const t = useT()
	const fileInputRef = useRef<HTMLInputElement>(null)

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			if (!isRunning) onSubmit()
		}
	}

	function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
		onChange(e.target.value)
	}

	async function handleCaptureTab() {
		try {
			const dataUrl = await captureActiveTab()
			onAttachmentsChange([...attachments, { dataUrl }])
		} catch (error) {
			console.error('[Composer] Failed to capture tab:', error)
			toast.error(t('ext.input.attach.captureFailed'))
		}
	}

	function handleUploadClick() {
		fileInputRef.current?.click()
	}

	async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const files = e.target.files
		if (!files || files.length === 0) return
		try {
			const next = [...attachments]
			for (const file of Array.from(files)) {
				if (!file.type.startsWith('image/')) continue
				const dataUrl = await readFileAsDataURL(file)
				next.push({ dataUrl })
			}
			onAttachmentsChange(next)
		} catch (error) {
			console.error('[Composer] Failed to read image file:', error)
			toast.error(t('ext.input.attach.uploadFailed'))
		} finally {
			e.target.value = ''
		}
	}

	function removeAttachment(index: number) {
		onAttachmentsChange(attachments.filter((_, i) => i !== index))
	}

	const canSend = (value.trim().length > 0 || attachments.length > 0) && !isRunning
	const attachLabel = modelSupportsImages
		? t('ext.input.attach.label')
		: t('ext.input.attach.unsupported')

	const isRecording = voiceState === 'recording'
	const isTranscribing = voiceState === 'transcribing'
	const micLabel = !voiceEnabled
		? t('ext.input.voice.disabled')
		: isRecording
			? t('ext.input.voice.stop')
			: isTranscribing
				? t('ext.input.voice.transcribing')
				: t('ext.input.voice.start')

	return (
		<div
			data-testid="composer"
			className="relative mx-3 mb-3 rounded-xl border border-white/5 bg-neutral-900/80 px-3 pt-2 pb-2 shadow-sm backdrop-blur"
		>
			{attachments.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-2 pt-1">
					{attachments.map((att, i) => (
						<div
							key={i}
							className="group relative h-14 w-14 overflow-hidden rounded-md border border-white/10 bg-neutral-800"
						>
							<img
								src={att.dataUrl}
								alt={t('ext.input.attach.thumbAlt')}
								className="h-full w-full object-cover"
							/>
							<button
								type="button"
								onClick={() => removeAttachment(i)}
								className="absolute right-0.5 top-0.5 flex size-4 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-90 hover:bg-black"
								aria-label={t('ext.input.attach.remove')}
								title={t('ext.input.attach.remove')}
							>
								<X className="size-3" aria-hidden="true" />
							</button>
						</div>
					))}
				</div>
			)}
			<Textarea
				ref={ref}
				data-testid="command-input"
				className="min-h-12 resize-none border-none bg-transparent px-0 pt-1 pb-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
				value={value}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={t('ext.input.placeholder')}
				disabled={isRunning}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				className="hidden"
				onChange={handleFileChange}
			/>
			<div className="mt-1 flex items-center justify-between gap-2">
				{isRecording ? (
					<RecordingIndicator label={t('ext.input.voice.listening')} />
				) : (
					<span aria-hidden="true" />
				)}
				<div className="flex items-center gap-1">
					{voiceEnabled ? (
						<span className="relative flex">
							{isRecording && (
								<span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500/40" />
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={isTranscribing}
								onClick={onMicToggle}
								className={cn(
									'relative size-7 hover:bg-white/5',
									isRecording ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground',
									!isTranscribing && 'cursor-pointer'
								)}
								aria-label={micLabel}
								title={micLabel}
							>
								{isTranscribing ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<Mic className="size-4" aria-hidden="true" />
								)}
							</Button>
						</span>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() =>
								toast.warning(<span className="select-none">{t('ext.input.voice.disabled')}</span>)
							}
							disabled={isRunning}
							aria-disabled="true"
							className="size-7 cursor-not-allowed text-neutral-500 opacity-60 hover:bg-transparent hover:text-neutral-500"
							aria-label={micLabel}
							title={micLabel}
						>
							<Mic className="size-4" aria-hidden="true" />
						</Button>
					)}
					{modelSupportsImages ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									disabled={isRunning}
									className="size-7 cursor-pointer text-muted-foreground hover:bg-white/5"
									aria-label={attachLabel}
									title={attachLabel}
								>
									<Plus className="size-4" aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem onSelect={handleCaptureTab}>
									<Camera />
									{t('ext.input.attach.captureTab')}
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={handleUploadClick}>
									<ImagePlus />
									{t('ext.input.attach.uploadImage')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() =>
								toast.warning(
									<span className="select-none">{t('ext.input.attach.unsupported')}</span>
								)
							}
							disabled={isRunning}
							aria-disabled="true"
							className="size-7 cursor-not-allowed text-neutral-500 opacity-60 hover:bg-transparent hover:text-neutral-500"
							aria-label={attachLabel}
							title={attachLabel}
						>
							<Plus className="size-4" aria-hidden="true" />
						</Button>
					)}
					{isRunning ? (
						<Button
							type="button"
							size="icon"
							onClick={onStop}
							className={cn(
								'size-7 cursor-pointer bg-red-700/85 text-white',
								'hover:bg-red-600/90 active:bg-red-800',
								'transition-colors duration-150'
							)}
							aria-label={t('ext.input.stop')}
							title={t('ext.input.stop')}
						>
							<Square className="size-3 fill-current" aria-hidden="true" />
						</Button>
					) : (
						<Button
							type="button"
							size="icon"
							onClick={onSubmit}
							disabled={!canSend}
							className={cn(
								'size-7 bg-amber-600 text-white hover:bg-amber-500',
								'disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400 disabled:opacity-100'
							)}
							aria-label={t('ext.input.send')}
							title={t('ext.input.send')}
						>
							<ArrowUp className="size-4" aria-hidden="true" />
						</Button>
					)}
				</div>
			</div>
		</div>
	)
})

/** Animated "listening" cue shown while capturing voice — a pulsing dot, an
 * equalizer waveform, and a label, so an active recording is unmistakable. */
function RecordingIndicator({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-2 pl-0.5 text-red-500">
			<span className="relative flex size-2">
				<span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70" />
				<span className="relative inline-flex size-2 rounded-full bg-red-500" />
			</span>
			<span className="flex h-3.5 items-center gap-[3px]" aria-hidden="true">
				{[0, 1, 2, 3, 4].map((i) => (
					<span
						key={i}
						className="h-full w-[3px] origin-center rounded-full bg-red-500"
						style={{
							animation: 'voice-wave 0.9s ease-in-out infinite',
							animationDelay: `${i * 0.12}s`,
						}}
					/>
				))}
			</span>
			<span className="text-xs font-medium">{label}</span>
		</div>
	)
}
