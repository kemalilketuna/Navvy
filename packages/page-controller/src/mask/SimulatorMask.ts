import { Motion } from 'ai-motion'

import { isPageDark } from './checkDarkMode'

import styles from './SimulatorMask.module.css'
import cursorStyles from './cursor.module.css'

export class SimulatorMask extends EventTarget {
	shown: boolean = false
	wrapper = document.createElement('div')
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	motion: Motion | null = null

	#disposed = false

	#cursor = document.createElement('div')
	#pointer = document.createElement('div')

	#currentCursorX = 0
	#currentCursorY = 0

	#targetCursorX = 0
	#targetCursorY = 0

	// The arrow SVG tip points up-left when rotation is 0 — see #buildCursorSvg.
	// This is the screen-space angle (in degrees) the tip naturally faces.
	static readonly #DEFAULT_TIP_ANGLE_DEG = -132

	#cursorAngleDeg = 0

	static readonly #STORAGE_KEY = 'navvy.cursorPos'
	#lastSavedAt = 0

	constructor() {
		super()

		this.wrapper.id = 'page-agent-runtime_simulator-mask'
		this.wrapper.className = styles.wrapper
		this.wrapper.setAttribute('data-browser-use-ignore', 'true')
		this.wrapper.setAttribute('data-page-agent-ignore', 'true')

		try {
			const motion = new Motion({
				mode: isPageDark() ? 'dark' : 'light',
				colors: ['rgb(255, 170, 64)', 'rgb(244, 63, 94)', 'rgb(168, 85, 247)', 'rgb(56, 189, 248)'],
				glowWidth: 18,
				borderWidth: 1,
				styles: { position: 'absolute', inset: '0', opacity: '0.65' },
			})
			this.motion = motion
			this.wrapper.appendChild(motion.element)
			motion.autoResize(this.wrapper)
		} catch (e) {
			console.warn('[SimulatorMask] Motion overlay unavailable:', e)
		}

		// Capture all mouse, keyboard, and wheel events
		this.wrapper.addEventListener('click', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('mousedown', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('mouseup', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('mousemove', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('wheel', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('keydown', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('keyup', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})

		// Create AI cursor
		this.#createCursor()
		// this.show()

		document.body.appendChild(this.wrapper)

		this.#moveCursorToTarget()

		// global events
		// @note Mask should be isolated from the rest of the code.
		// Global events are easier to manage and cleanup.

		const movePointerToListener = (event: Event) => {
			const { x, y } = (event as CustomEvent).detail
			this.setCursorPosition(x, y)
		}
		const clickPointerListener = () => {
			this.triggerClickAnimation()
		}
		const enablePassThroughListener = () => {
			this.wrapper.style.pointerEvents = 'none'
		}
		const disablePassThroughListener = () => {
			this.wrapper.style.pointerEvents = 'auto'
		}

		// Flush the latest cursor state right before navigation so the next page can restore it.
		// Without this, the 120 ms throttle on saves can drop the last move.
		const pagehideListener = () => this.#savePositionNow()

		window.addEventListener('PageAgent::MovePointerTo', movePointerToListener)
		window.addEventListener('PageAgent::ClickPointer', clickPointerListener)
		window.addEventListener('PageAgent::EnablePassThrough', enablePassThroughListener)
		window.addEventListener('PageAgent::DisablePassThrough', disablePassThroughListener)
		window.addEventListener('pagehide', pagehideListener)

		this.addEventListener('dispose', () => {
			window.removeEventListener('PageAgent::MovePointerTo', movePointerToListener)
			window.removeEventListener('PageAgent::ClickPointer', clickPointerListener)
			window.removeEventListener('PageAgent::EnablePassThrough', enablePassThroughListener)
			window.removeEventListener('PageAgent::DisablePassThrough', disablePassThroughListener)
			window.removeEventListener('pagehide', pagehideListener)
		})
	}

	/**
	 * Build the cursor arrow SVG. The arrow shape is adapted from the Navvy
	 * extension logo (`logo.svg`): the original path `M44 42 L88 58 L66 66 L58 90`
	 * in a 128x128 viewBox is rescaled to a 24x24 viewBox with the tip pinned
	 * at (3, 3) so it lines up with the cursor's transform-origin.
	 */
	#buildCursorSvg(): SVGSVGElement {
		const svgNS = 'http://www.w3.org/2000/svg'
		const svg = document.createElementNS(svgNS, 'svg')
		svg.setAttribute('viewBox', '0 0 24 24')
		svg.setAttribute('aria-hidden', 'true')

		const defs = document.createElementNS(svgNS, 'defs')
		const gradient = document.createElementNS(svgNS, 'linearGradient')
		gradient.setAttribute('id', 'navvy-cursor-fill')
		gradient.setAttribute('x1', '3')
		gradient.setAttribute('y1', '3')
		gradient.setAttribute('x2', '22')
		gradient.setAttribute('y2', '24')
		gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
		const stop1 = document.createElementNS(svgNS, 'stop')
		stop1.setAttribute('offset', '0%')
		stop1.setAttribute('stop-color', '#F5E9D4')
		const stop2 = document.createElementNS(svgNS, 'stop')
		stop2.setAttribute('offset', '100%')
		stop2.setAttribute('stop-color', '#E8C789')
		gradient.appendChild(stop1)
		gradient.appendChild(stop2)
		defs.appendChild(gradient)
		svg.appendChild(defs)

		const path = document.createElementNS(svgNS, 'path')
		path.setAttribute('fill', 'url(#navvy-cursor-fill)')
		path.setAttribute('stroke', '#1F1F1F')
		path.setAttribute('stroke-width', '1.1')
		path.setAttribute('stroke-linejoin', 'round')
		path.setAttribute('stroke-linecap', 'round')
		path.setAttribute('d', 'M3 3 L21.9 9.9 L12.5 13.3 L9 23.6 Z')
		svg.appendChild(path)

		return svg
	}

	#createCursor() {
		this.#cursor.className = cursorStyles.cursor

		this.#pointer.className = cursorStyles.pointer
		this.#pointer.appendChild(this.#buildCursorSvg())
		this.#pointer.style.setProperty('--cursor-angle', '0deg')
		this.#cursor.appendChild(this.#pointer)

		const ripple = document.createElement('div')
		ripple.className = cursorStyles.ripple
		this.#cursor.appendChild(ripple)

		this.wrapper.appendChild(this.#cursor)
	}

	#moveCursorToTarget() {
		if (this.#disposed) return

		const newX = this.#currentCursorX + (this.#targetCursorX - this.#currentCursorX) * 0.08
		const newY = this.#currentCursorY + (this.#targetCursorY - this.#currentCursorY) * 0.08

		const xDistance = Math.abs(newX - this.#targetCursorX)
		if (xDistance > 0) {
			if (xDistance < 2) {
				this.#currentCursorX = this.#targetCursorX
			} else {
				this.#currentCursorX = newX
			}
			this.#cursor.style.left = `${this.#currentCursorX}px`
		}

		const yDistance = Math.abs(newY - this.#targetCursorY)
		if (yDistance > 0) {
			if (yDistance < 2) {
				this.#currentCursorY = this.#targetCursorY
			} else {
				this.#currentCursorY = newY
			}
			this.#cursor.style.top = `${this.#currentCursorY}px`
		}

		requestAnimationFrame(() => this.#moveCursorToTarget())
	}

	setCursorPosition(x: number, y: number) {
		if (this.#disposed) return

		const dx = x - this.#currentCursorX
		const dy = y - this.#currentCursorY
		// Only re-aim for moves long enough to have a meaningful direction;
		// short hops would otherwise cause the cursor to twitch.
		if (dx * dx + dy * dy >= 16 * 16) {
			const targetAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
			const rotationDeg = this.#shortestRotation(
				this.#cursorAngleDeg,
				targetAngleDeg - SimulatorMask.#DEFAULT_TIP_ANGLE_DEG
			)
			this.#cursorAngleDeg = rotationDeg
			this.#pointer.style.setProperty('--cursor-angle', `${rotationDeg}deg`)
		}

		this.#targetCursorX = x
		this.#targetCursorY = y
		this.#savePositionThrottled(x, y, this.#cursorAngleDeg)
	}

	// Pick the next-angle representation closest to `from` (no >180° spins).
	#shortestRotation(from: number, to: number): number {
		const delta = ((((to - from) % 360) + 540) % 360) - 180
		return from + delta
	}

	#savePositionThrottled(x: number, y: number, angleDeg: number) {
		const now = Date.now()
		if (now - this.#lastSavedAt < 120) return
		this.#lastSavedAt = now
		this.#writePosition(x, y, angleDeg)
	}

	#savePositionNow() {
		this.#writePosition(this.#targetCursorX, this.#targetCursorY, this.#cursorAngleDeg)
	}

	#writePosition(x: number, y: number, angleDeg: number) {
		const payload = JSON.stringify({
			x,
			y,
			angleDeg,
			w: window.innerWidth,
			h: window.innerHeight,
		})
		try {
			sessionStorage.setItem(SimulatorMask.#STORAGE_KEY, payload)
		} catch (e) {
			console.warn('[SimulatorMask] sessionStorage write failed:', e)
		}
		// chrome.storage.local survives cross-origin navigations and is reachable from content scripts.
		const c = (globalThis as any).chrome
		if (c?.storage?.local?.set) {
			c.storage.local
				.set({ [SimulatorMask.#STORAGE_KEY]: payload })
				.catch((e: unknown) =>
					console.warn('[SimulatorMask] chrome.storage.local write failed:', e)
				)
		}
	}

	async #loadSavedPosition(): Promise<{
		x: number
		y: number
		angleDeg: number
		w: number
		h: number
	} | null> {
		const parse = (raw: unknown) => {
			if (typeof raw !== 'string') return null
			const p = JSON.parse(raw)
			if (
				typeof p.x === 'number' &&
				typeof p.y === 'number' &&
				typeof p.w === 'number' &&
				typeof p.h === 'number'
			) {
				// angleDeg was added later; tolerate older payloads by defaulting to 0.
				const angleDeg = typeof p.angleDeg === 'number' ? p.angleDeg : 0
				return { x: p.x, y: p.y, angleDeg, w: p.w, h: p.h }
			}
			console.warn('[SimulatorMask] discarding saved cursor position with unexpected shape:', p)
			return null
		}
		const c = (globalThis as any).chrome
		if (c?.storage?.local?.get) {
			try {
				const data = await c.storage.local.get(SimulatorMask.#STORAGE_KEY)
				const p = parse(data[SimulatorMask.#STORAGE_KEY])
				if (p) return p
			} catch (e) {
				console.warn('[SimulatorMask] chrome.storage.local read failed:', e)
			}
		}
		try {
			return parse(sessionStorage.getItem(SimulatorMask.#STORAGE_KEY))
		} catch (e) {
			console.warn('[SimulatorMask] sessionStorage read failed:', e)
			return null
		}
	}

	triggerClickAnimation() {
		if (this.#disposed) return

		this.#cursor.classList.remove(cursorStyles.clicking)
		// Force reflow to restart animation
		void this.#cursor.offsetHeight
		this.#cursor.classList.add(cursorStyles.clicking)
	}

	show() {
		if (this.shown || this.#disposed) return

		this.shown = true
		this.motion?.start()
		this.motion?.fadeIn()

		this.wrapper.classList.add(styles.visible)

		// Initialize cursor position only on first show; subsequent shows keep the last position.
		if (this.#currentCursorX === 0 && this.#currentCursorY === 0) {
			this.#currentCursorX = window.innerWidth / 2
			this.#currentCursorY = window.innerHeight / 2
			this.#targetCursorX = this.#currentCursorX
			this.#targetCursorY = this.#currentCursorY
			this.#cursor.style.left = `${this.#currentCursorX}px`
			this.#cursor.style.top = `${this.#currentCursorY}px`

			// Try to restore the last position from a previous page (async).
			void this.#loadSavedPosition().then((saved) => {
				if (!saved || this.#disposed) return
				// Skip if the agent already moved the cursor since show().
				if (
					this.#targetCursorX !== this.#currentCursorX ||
					this.#targetCursorY !== this.#currentCursorY
				)
					return
				// Scale to the current viewport in case it changed across pages.
				const scaleX = window.innerWidth / saved.w
				const scaleY = window.innerHeight / saved.h
				const x = Math.max(0, Math.min(window.innerWidth, saved.x * scaleX))
				const y = Math.max(0, Math.min(window.innerHeight, saved.y * scaleY))
				this.#currentCursorX = x
				this.#currentCursorY = y
				this.#targetCursorX = x
				this.#targetCursorY = y
				this.#cursor.style.left = `${x}px`
				this.#cursor.style.top = `${y}px`
				this.#cursorAngleDeg = saved.angleDeg
				// Snap to the saved angle without animating from 0deg.
				const prevTransition = this.#pointer.style.transition
				this.#pointer.style.transition = 'none'
				this.#pointer.style.setProperty('--cursor-angle', `${saved.angleDeg}deg`)
				void this.#pointer.offsetWidth
				this.#pointer.style.transition = prevTransition
			})
		}
	}

	hide() {
		if (!this.shown || this.#disposed) return

		this.shown = false
		this.motion?.fadeOut()
		this.motion?.pause()

		this.#cursor.classList.remove(cursorStyles.clicking)

		setTimeout(() => {
			this.wrapper.classList.remove(styles.visible)
		}, 800) // Match the animation duration
	}

	dispose() {
		this.#disposed = true
		console.log('dispose SimulatorMask')
		this.motion?.dispose()
		this.wrapper.remove()
		this.dispatchEvent(new Event('dispose'))
	}
}
