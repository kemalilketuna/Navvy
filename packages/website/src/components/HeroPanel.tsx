import { useEffect, useRef, useState } from 'react'

// Mirrors the extension's idle screen (logo + wordmark + typing slogan),
// reproduced standalone so the landing page needs no extension/i18n/chrome deps.
const TIPS = [
	'Hand off the boring clicks to AI',
	'Browse by intent, not by mouse',
	'Make any website more accessible',
	'Think more, click less',
]

function useTypingSlogan(words: string[], typeSpeed = 55, deleteSpeed = 28, pauseDelay = 2600) {
	const [text, setText] = useState('')
	const stateRef = useRef({ word: 0, char: 0, phase: 'typing' as 'typing' | 'pause' | 'deleting' })

	useEffect(() => {
		if (words.length === 0) return
		let timer: ReturnType<typeof setTimeout>

		const tick = () => {
			const s = stateRef.current
			const current = Array.from(words[s.word] ?? '')
			let delay = typeSpeed

			switch (s.phase) {
				case 'typing':
					if (s.char < current.length) {
						s.char += 1
						setText(current.slice(0, s.char).join(''))
						delay = typeSpeed
					} else {
						s.phase = 'pause'
						delay = pauseDelay
					}
					break
				case 'pause':
					s.phase = 'deleting'
					delay = deleteSpeed
					break
				case 'deleting':
					if (s.char > 0) {
						s.char -= 1
						setText(current.slice(0, s.char).join(''))
						delay = deleteSpeed
					} else {
						s.word = (s.word + 1) % words.length
						s.phase = 'typing'
						delay = typeSpeed
					}
					break
			}
			timer = setTimeout(tick, delay)
		}

		timer = setTimeout(tick, typeSpeed)
		return () => clearTimeout(timer)
	}, [words, typeSpeed, deleteSpeed, pauseDelay])

	return text
}

export default function HeroPanel() {
	const slogan = useTypingSlogan(TIPS)

	return (
		<div className="relative mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
			<div className="relative grid place-items-center">
				<div className="pointer-events-none absolute size-72 rounded-full border border-[var(--color-amber)]/20 sm:size-80" />
				<div className="pointer-events-none absolute size-56 rounded-full border border-dashed border-[var(--color-amber)]/30 sm:size-64" />
				<svg
					viewBox="0 0 128 128"
					aria-hidden="true"
					className="size-56 -rotate-12 drop-shadow-[0_22px_50px_rgba(217,130,26,0.3)] sm:size-64"
				>
					<defs>
						<linearGradient
							id="navvyArrow"
							x1="40"
							y1="40"
							x2="92"
							y2="92"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0%" stopColor="#e89a30" />
							<stop offset="55%" stopColor="#d9821a" />
							<stop offset="100%" stopColor="#985012" />
						</linearGradient>
					</defs>
					<path
						d="M44 42 L88 58 L66 66 L58 90 Z"
						fill="url(#navvyArrow)"
						stroke="#7a3f0e"
						strokeWidth="2.25"
						strokeLinejoin="round"
					/>
				</svg>
			</div>

			<div className="flex flex-col items-center gap-1.5">
				<h2 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Navvy</h2>
				<p className="text-xs uppercase tracking-[0.25em] text-ink-muted">Browser agent</p>
			</div>

			<p className="min-h-7 max-w-sm text-lg text-ink-muted">
				{slogan}
				<span className="blink-cursor ml-px inline-block text-[var(--color-amber)]">_</span>
			</p>
		</div>
	)
}
