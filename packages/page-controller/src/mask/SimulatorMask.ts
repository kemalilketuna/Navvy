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

	#currentCursorX = 0
	#currentCursorY = 0

	#targetCursorX = 0
	#targetCursorY = 0

	constructor() {
		super()

		this.wrapper.id = 'page-agent-runtime_simulator-mask'
		this.wrapper.className = styles.wrapper
		this.wrapper.setAttribute('data-browser-use-ignore', 'true')
		this.wrapper.setAttribute('data-page-agent-ignore', 'true')

		try {
			const motion = new Motion({
				mode: isPageDark() ? 'dark' : 'light',
				colors: [
					'rgb(255, 170, 64)',
					'rgb(244, 63, 94)',
					'rgb(168, 85, 247)',
					'rgb(56, 189, 248)',
					'rgb(34, 197, 94)',
				],
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

		window.addEventListener('PageAgent::MovePointerTo', movePointerToListener)
		window.addEventListener('PageAgent::ClickPointer', clickPointerListener)
		window.addEventListener('PageAgent::EnablePassThrough', enablePassThroughListener)
		window.addEventListener('PageAgent::DisablePassThrough', disablePassThroughListener)

		this.addEventListener('dispose', () => {
			window.removeEventListener('PageAgent::MovePointerTo', movePointerToListener)
			window.removeEventListener('PageAgent::ClickPointer', clickPointerListener)
			window.removeEventListener('PageAgent::EnablePassThrough', enablePassThroughListener)
			window.removeEventListener('PageAgent::DisablePassThrough', disablePassThroughListener)
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

		const pointer = document.createElement('div')
		pointer.className = cursorStyles.pointer
		pointer.appendChild(this.#buildCursorSvg())
		this.#cursor.appendChild(pointer)

		const ripple = document.createElement('div')
		ripple.className = cursorStyles.ripple
		this.#cursor.appendChild(ripple)

		this.wrapper.appendChild(this.#cursor)
	}

	#moveCursorToTarget() {
		if (this.#disposed) return

		const newX = this.#currentCursorX + (this.#targetCursorX - this.#currentCursorX) * 0.2
		const newY = this.#currentCursorY + (this.#targetCursorY - this.#currentCursorY) * 0.2

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

		this.#targetCursorX = x
		this.#targetCursorY = y
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

		// Initialize cursor position
		this.#currentCursorX = window.innerWidth / 2
		this.#currentCursorY = window.innerHeight / 2
		this.#targetCursorX = this.#currentCursorX
		this.#targetCursorY = this.#currentCursorY
		this.#cursor.style.left = `${this.#currentCursorX}px`
		this.#cursor.style.top = `${this.#currentCursorY}px`
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
