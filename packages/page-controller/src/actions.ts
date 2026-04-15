/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import type { InteractiveElementDomNode } from './dom/dom_tree/type'
import {
	clickPointer,
	disablePassThrough,
	enablePassThrough,
	getNativeValueSetter,
	isHTMLElement,
	isInputElement,
	isSelectElement,
	isTextAreaElement,
	movePointerToElement,
	waitFor,
} from './utils'

export interface DropdownOption {
	value: string
	text: string
	index: number
	selected: boolean
}

/**
 * Get the HTMLElement by index from a selectorMap.
 * @private Internal method, subject to change at any time.
 */
export function getElementByIndex(
	selectorMap: Map<number, InteractiveElementDomNode>,
	index: number
): HTMLElement {
	const interactiveNode = selectorMap.get(index)
	if (!interactiveNode) {
		throw new Error(`No interactive element found at index ${index}`)
	}

	const element = interactiveNode.ref
	if (!element) {
		throw new Error(`Element at index ${index} does not have a reference`)
	}

	if (!isHTMLElement(element)) {
		throw new Error(`Element at index ${index} is not an HTMLElement`)
	}

	return element
}

let lastClickedElement: HTMLElement | null = null

function blurLastClickedElement() {
	if (lastClickedElement) {
		lastClickedElement.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }))
		lastClickedElement.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }))
		lastClickedElement.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
		lastClickedElement.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
		lastClickedElement.blur()
		lastClickedElement = null
	}
}

/**
 * Simulate a full click following W3C Pointer Events + UI Events spec order:
 * pointerover/enter → mouseover/enter → pointerdown → mousedown → [focus] →
 * pointerup → mouseup → click
 *
 * @private Internal method, subject to change at any time.
 */
export async function clickElement(element: HTMLElement) {
	blurLastClickedElement()

	lastClickedElement = element

	await scrollIntoViewIfNeeded(element)
	const frame = element.ownerDocument.defaultView?.frameElement
	if (frame) await scrollIntoViewIfNeeded(frame)

	const rect = element.getBoundingClientRect()
	const x = rect.left + rect.width / 2
	const y = rect.top + rect.height / 2

	await movePointerToElement(element, x, y)
	await clickPointer()

	await waitFor(0.1)

	// Hit-test to find the deepest element at click coordinates, matching
	// real browser behavior where events target the innermost element.
	// @note This may hit a element in the blacklist
	// TODO: This is a temporary workaround. Should have been handled during dom extraction.
	const doc = element.ownerDocument
	await enablePassThrough()
	const hitTarget = doc.elementFromPoint(x, y)
	await disablePassThrough()
	const target =
		hitTarget instanceof HTMLElement && element.contains(hitTarget) ? hitTarget : element

	const pointerOpts = {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		pointerType: 'mouse',
	}
	const mouseOpts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }

	// Hover — pointer events first, then mouse events (spec order)
	target.dispatchEvent(new PointerEvent('pointerover', pointerOpts))
	target.dispatchEvent(new PointerEvent('pointerenter', { ...pointerOpts, bubbles: false }))
	target.dispatchEvent(new MouseEvent('mouseover', mouseOpts))
	target.dispatchEvent(new MouseEvent('mouseenter', { ...mouseOpts, bubbles: false }))

	// Press
	target.dispatchEvent(new PointerEvent('pointerdown', pointerOpts))
	target.dispatchEvent(new MouseEvent('mousedown', mouseOpts))

	// Focus is not part of the standard pointer/mouse event sequence
	// "undefined and varies between user agents".
	// We focus the original element (nearest focusable ancestor), not the hit-test target, matching browser behavior.
	element.focus({ preventScroll: true })

	// Release
	target.dispatchEvent(new PointerEvent('pointerup', pointerOpts))
	target.dispatchEvent(new MouseEvent('mouseup', mouseOpts))

	// Click — activation behavior (navigation, form submit, etc.) triggers
	// via bubbling from target up to the interactive ancestor.
	target.click()

	await waitFor(0.2)
}

/**
 * @private Internal method, subject to change at any time.
 */
export async function inputTextElement(element: HTMLElement, text: string) {
	const isContentEditable = element.isContentEditable
	if (!isInputElement(element) && !isTextAreaElement(element) && !isContentEditable) {
		throw new Error('Element is not an input, textarea, or contenteditable')
	}

	await clickElement(element)

	if (isContentEditable) {
		// Contenteditable support (partial)
		// Not supported:
		// - Monaco/CodeMirror: Require direct JS instance access. No universal way to obtain.
		// - Draft.js: Not responsive to synthetic/execCommand/Range/DataTransfer. Unmaintained.
		//
		// Strategy: Try Plan A (synthetic events) first, then verify and fall back
		// to Plan B (execCommand) if the text wasn't actually inserted.
		//
		// Plan A: Dispatch synthetic events
		// Works: React contenteditable, Quill.
		// Fails: Slate.js, some contenteditable editors that ignore synthetic events.
		// Sequence: beforeinput -> mutation -> input -> change -> blur

		// Dispatch beforeinput + mutation + input for clearing
		if (
			element.dispatchEvent(
				new InputEvent('beforeinput', {
					bubbles: true,
					cancelable: true,
					inputType: 'deleteContent',
				})
			)
		) {
			element.innerText = ''
			element.dispatchEvent(
				new InputEvent('input', {
					bubbles: true,
					inputType: 'deleteContent',
				})
			)
		}

		// Dispatch beforeinput + mutation + input for insertion (important for React apps)
		if (
			element.dispatchEvent(
				new InputEvent('beforeinput', {
					bubbles: true,
					cancelable: true,
					inputType: 'insertText',
					data: text,
				})
			)
		) {
			element.innerText = text
			element.dispatchEvent(
				new InputEvent('input', {
					bubbles: true,
					inputType: 'insertText',
					data: text,
				})
			)
		}

		// Verify Plan A worked by checking if the text was actually inserted
		const planASucceeded = element.innerText.trim() === text.trim()

		if (!planASucceeded) {
			// Plan B: execCommand fallback (deprecated but widely supported)
			// Works: Quill, Slate.js, react contenteditable components.
			// This approach integrates with the browser's undo stack and is handled
			// natively by most rich-text editors.
			element.focus()

			// Select all existing content and delete it
			const doc = element.ownerDocument
			const selection = (doc.defaultView || window).getSelection()
			const range = doc.createRange()
			range.selectNodeContents(element)
			selection?.removeAllRanges()
			selection?.addRange(range)

			// eslint-disable-next-line @typescript-eslint/no-deprecated
			doc.execCommand('delete', false)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			doc.execCommand('insertText', false, text)
		}

		// Dispatch change event (for good measure)
		element.dispatchEvent(new Event('change', { bubbles: true }))

		// Trigger blur for validation
		element.blur()
	} else {
		const inputEl = element as HTMLInputElement | HTMLTextAreaElement
		inputEl.focus({ preventScroll: true })

		const setter = getNativeValueSetter(inputEl)

		// Clear existing value with proper event sequence so frameworks notice.
		if (inputEl.value !== '') {
			inputEl.dispatchEvent(
				new InputEvent('beforeinput', {
					bubbles: true,
					cancelable: true,
					inputType: 'deleteContentBackward',
				})
			)
			setter.call(inputEl, '')
			inputEl.dispatchEvent(
				new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' })
			)
		}

		inputEl.dispatchEvent(
			new InputEvent('beforeinput', {
				bubbles: true,
				cancelable: true,
				inputType: 'insertText',
				data: text,
			})
		)
		setter.call(inputEl, text)
		inputEl.dispatchEvent(
			new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })
		)
	}

	await waitFor(0.1)

	// Don't blur the just-typed field — that closes typeaheads/autosuggest
	// (e.g. Wikipedia search) and triggers premature validation. Just drop
	// the click-tracking reference so the next click cleans up correctly.
	lastClickedElement = null
}

/**
 * @todo browser-use version is very complex and supports menu tags, need to follow up
 * @private Internal method, subject to change at any time.
 */
export async function selectOptionElement(selectElement: HTMLSelectElement, optionText: string) {
	if (!isSelectElement(selectElement)) {
		throw new Error('Element is not a select element')
	}

	const options = Array.from(selectElement.options)
	const option = options.find((opt) => opt.textContent?.trim() === optionText.trim())

	if (!option) {
		throw new Error(`Option with text "${optionText}" not found in select element`)
	}

	selectElement.value = option.value
	selectElement.dispatchEvent(new Event('change', { bubbles: true }))

	await waitFor(0.1) // Wait to ensure change event processing completes
}

interface ScrollableElement extends Element {
	scrollIntoViewIfNeeded?: (centerIfNeeded?: boolean) => void
}

/**
 * @private Internal method, subject to change at any time.
 */
export async function scrollIntoViewIfNeeded(element: Element) {
	const el = element as ScrollableElement
	if (typeof el.scrollIntoViewIfNeeded === 'function') {
		el.scrollIntoViewIfNeeded()
		// await waitFor(0.5) // Animation playback
	} else {
		// @todo visibility check
		element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
		// await waitFor(0.5) // Animation playback
	}
}

export async function scrollVertically(scroll_amount: number, element?: HTMLElement | null) {
	// Element-specific scrolling if element is provided
	if (element) {
		const targetElement = element
		let currentElement = targetElement as HTMLElement | null
		let scrollSuccess = false
		let scrolledElement: HTMLElement | null = null
		let scrollDelta = 0
		let attempts = 0
		const dy = scroll_amount

		while (currentElement && attempts < 10) {
			const computedStyle = window.getComputedStyle(currentElement)
			const hasScrollableY =
				/(auto|scroll|overlay)/.test(computedStyle.overflowY) ||
				(computedStyle.scrollbarWidth && computedStyle.scrollbarWidth !== 'auto') ||
				(computedStyle.scrollbarGutter && computedStyle.scrollbarGutter !== 'auto')
			const canScrollVertically = currentElement.scrollHeight > currentElement.clientHeight

			if (hasScrollableY && canScrollVertically) {
				const beforeScroll = currentElement.scrollTop
				const maxScroll = currentElement.scrollHeight - currentElement.clientHeight

				let scrollAmount = dy / 3

				if (scrollAmount > 0) {
					scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll)
				} else {
					scrollAmount = Math.max(scrollAmount, -beforeScroll)
				}

				currentElement.scrollTop = beforeScroll + scrollAmount

				const afterScroll = currentElement.scrollTop
				const actualScrollDelta = afterScroll - beforeScroll

				if (Math.abs(actualScrollDelta) > 0.5) {
					scrollSuccess = true
					scrolledElement = currentElement
					scrollDelta = actualScrollDelta
					break
				}
			}

			if (currentElement === document.body || currentElement === document.documentElement) {
				break
			}
			currentElement = currentElement.parentElement
			attempts++
		}

		if (scrollSuccess) {
			return `Scrolled container (${scrolledElement?.tagName}) by ${scrollDelta}px`
		} else {
			return `No scrollable container found for element (${targetElement.tagName})`
		}
	}

	// Page-level scrolling (default or fallback)

	const dy = scroll_amount
	const bigEnough = (el: HTMLElement) => el.clientHeight >= window.innerHeight * 0.5
	const canScroll = (el: HTMLElement | null) =>
		el &&
		/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY) &&
		el.scrollHeight > el.clientHeight &&
		bigEnough(el)

	// @deprecated Heuristic container search.
	// Unreliable in multi-panel layouts. Should guide LLMs to use indexed scroll for consistency.
	// TODO: remove this fallback

	// try to find the nearest scrollable container
	// document.activeElement is usually body.
	// After a successful element.focus(), activeElement become the nearest focusable parent

	let el: HTMLElement | null = document.activeElement as HTMLElement | null
	while (el && !canScroll(el) && el !== document.body) el = el.parentElement

	// Something is wrong if it falls back to global '*' search
	// TODO: Return error message instead of global '*' search

	el = canScroll(el)
		? el
		: Array.from(document.querySelectorAll<HTMLElement>('*')).find(canScroll) ||
			(document.scrollingElement as HTMLElement) ||
			(document.documentElement as HTMLElement)

	if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
		// Page-level scroll
		const scrollBefore = window.scrollY
		const scrollMax = document.documentElement.scrollHeight - window.innerHeight

		window.scrollBy(0, dy)

		const scrollAfter = window.scrollY
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dy > 0
				? `⚠️ Already at the bottom of the page, cannot scroll down further.`
				: `⚠️ Already at the top of the page, cannot scroll up further.`
		}

		const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1
		const reachedTop = dy < 0 && scrollAfter <= 1

		if (reachedBottom) return `✅ Scrolled page by ${scrolled}px. Reached the bottom of the page.`
		if (reachedTop) return `✅ Scrolled page by ${scrolled}px. Reached the top of the page.`
		return `✅ Scrolled page by ${scrolled}px.`
	} else {
		// Container scroll

		const warningMsg = `The document is not scrollable. Falling back to container scroll.`
		console.log(`[PageController] ${warningMsg}`)

		const scrollBefore = el!.scrollTop
		const scrollMax = el!.scrollHeight - el!.clientHeight

		el!.scrollBy({ top: dy, behavior: 'smooth' })
		await waitFor(0.1)

		const scrollAfter = el!.scrollTop
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dy > 0
				? `⚠️ ${warningMsg} Already at the bottom of container (${el!.tagName}), cannot scroll down further.`
				: `⚠️ ${warningMsg} Already at the top of container (${el!.tagName}), cannot scroll up further.`
		}

		const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1
		const reachedTop = dy < 0 && scrollAfter <= 1

		if (reachedBottom)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the bottom.`
		if (reachedTop)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the top.`
		return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px.`
	}
}

/**
 * Parse a key combo like "ctrl+shift+a" or "Enter" into a KeyboardEventInit.
 * @private Internal method, subject to change at any time.
 */
function parseKeyCombo(combo: string): KeyboardEventInit & { key: string } {
	const parts = combo
		.split('+')
		.map((s) => s.trim())
		.filter(Boolean)
	const main = parts.pop() ?? ''
	const init: KeyboardEventInit & { key: string } = {
		key: main,
		bubbles: true,
		cancelable: true,
	}
	for (const mod of parts) {
		const m = mod.toLowerCase()
		if (m === 'ctrl' || m === 'control') init.ctrlKey = true
		else if (m === 'shift') init.shiftKey = true
		else if (m === 'alt' || m === 'option') init.altKey = true
		else if (m === 'meta' || m === 'cmd' || m === 'command') init.metaKey = true
	}
	if (main.length === 1) {
		init.code = `Key${main.toUpperCase()}`
	} else {
		init.code = main
	}
	return init
}

/**
 * Dispatch a sequence of key events to the focused element (or body).
 * Multiple combos can be separated by whitespace, e.g. "Tab Enter" or "ctrl+a Delete".
 * @private Internal method, subject to change at any time.
 */
export async function sendKeys(keys: string): Promise<string> {
	const combos = keys.split(/\s+/).filter(Boolean)
	if (combos.length === 0) {
		throw new Error('No keys provided')
	}
	const target = (document.activeElement as HTMLElement | null) ?? document.body
	for (const combo of combos) {
		const init = parseKeyCombo(combo)
		target.dispatchEvent(new KeyboardEvent('keydown', init))
		target.dispatchEvent(new KeyboardEvent('keyup', init))
		await waitFor(0.05)
	}
	return `Dispatched keys: ${combos.join(', ')} to <${target.tagName.toLowerCase()}>`
}

/**
 * Navigate back in browser history.
 * @private Internal method, subject to change at any time.
 */
export async function goBack(): Promise<string> {
	if (window.history.length <= 1) {
		return 'No previous page in history'
	}
	window.history.back()
	await waitFor(0.3)
	return `Navigated back. Current URL: ${window.location.href}`
}

/**
 * Find first text occurrence in the page and scroll it into view.
 * Case-insensitive substring match across visible text nodes.
 * @private Internal method, subject to change at any time.
 */
export async function scrollToText(text: string): Promise<HTMLElement | null> {
	const needle = text.toLowerCase().trim()
	if (!needle) return null

	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const value = node.nodeValue?.toLowerCase() ?? ''
			if (!value.includes(needle)) return NodeFilter.FILTER_REJECT
			const parent = node.parentElement
			if (!parent) return NodeFilter.FILTER_REJECT
			const style = window.getComputedStyle(parent)
			if (style.display === 'none' || style.visibility === 'hidden') {
				return NodeFilter.FILTER_REJECT
			}
			return NodeFilter.FILTER_ACCEPT
		},
	})
	const node = walker.nextNode()
	const parent = node?.parentElement
	if (!parent) return null

	await scrollIntoViewIfNeeded(parent)
	return parent
}

/**
 * Read all options from a native <select> element.
 * @private Internal method, subject to change at any time.
 */
export function getDropdownOptions(element: HTMLElement): DropdownOption[] {
	if (!isSelectElement(element)) {
		throw new Error('Element is not a <select>')
	}
	return Array.from(element.options).map((opt, i) => ({
		index: i,
		value: opt.value,
		text: (opt.textContent ?? '').trim(),
		selected: opt.selected,
	}))
}

/**
 * Simulate a drag-and-drop gesture from source to target element.
 * Dispatches both Pointer/Mouse events and HTML5 DragEvents.
 * @private Internal method, subject to change at any time.
 */
export async function dragAndDrop(source: HTMLElement, target: HTMLElement): Promise<string> {
	await scrollIntoViewIfNeeded(source)
	const sr = source.getBoundingClientRect()
	const tr = target.getBoundingClientRect()
	const sx = sr.left + sr.width / 2
	const sy = sr.top + sr.height / 2
	const tx = tr.left + tr.width / 2
	const ty = tr.top + tr.height / 2

	const pointerOpts = (x: number, y: number) => ({
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		pointerType: 'mouse',
	})
	const mouseOpts = (x: number, y: number) => ({
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		button: 0,
	})
	const dataTransfer = new DataTransfer()
	const dragOpts = (x: number, y: number) => ({
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		dataTransfer,
	})

	source.dispatchEvent(new PointerEvent('pointerdown', pointerOpts(sx, sy)))
	source.dispatchEvent(new MouseEvent('mousedown', mouseOpts(sx, sy)))
	source.dispatchEvent(new DragEvent('dragstart', dragOpts(sx, sy)))

	const steps = 8
	for (let i = 1; i <= steps; i++) {
		const x = sx + ((tx - sx) * i) / steps
		const y = sy + ((ty - sy) * i) / steps
		document.dispatchEvent(new PointerEvent('pointermove', pointerOpts(x, y)))
		source.dispatchEvent(new DragEvent('drag', dragOpts(x, y)))
		target.dispatchEvent(new DragEvent('dragenter', dragOpts(x, y)))
		target.dispatchEvent(new DragEvent('dragover', dragOpts(x, y)))
		await waitFor(0.02)
	}

	target.dispatchEvent(new DragEvent('drop', dragOpts(tx, ty)))
	source.dispatchEvent(new DragEvent('dragend', dragOpts(tx, ty)))
	target.dispatchEvent(new PointerEvent('pointerup', pointerOpts(tx, ty)))
	target.dispatchEvent(new MouseEvent('mouseup', mouseOpts(tx, ty)))

	await waitFor(0.1)
	return `Dragged <${source.tagName.toLowerCase()}> → <${target.tagName.toLowerCase()}>`
}

export async function scrollHorizontally(scroll_amount: number, element?: HTMLElement | null) {
	// Element-specific scrolling if element is provided
	if (element) {
		const targetElement = element
		let currentElement = targetElement as HTMLElement | null
		let scrollSuccess = false
		let scrolledElement: HTMLElement | null = null
		let scrollDelta = 0
		let attempts = 0
		const dx = scroll_amount

		while (currentElement && attempts < 10) {
			const computedStyle = window.getComputedStyle(currentElement)
			const hasScrollableX =
				/(auto|scroll|overlay)/.test(computedStyle.overflowX) ||
				(computedStyle.scrollbarWidth && computedStyle.scrollbarWidth !== 'auto') ||
				(computedStyle.scrollbarGutter && computedStyle.scrollbarGutter !== 'auto')
			const canScrollHorizontally = currentElement.scrollWidth > currentElement.clientWidth

			if (hasScrollableX && canScrollHorizontally) {
				const beforeScroll = currentElement.scrollLeft
				const maxScroll = currentElement.scrollWidth - currentElement.clientWidth

				let scrollAmount = dx / 3

				if (scrollAmount > 0) {
					scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll)
				} else {
					scrollAmount = Math.max(scrollAmount, -beforeScroll)
				}

				currentElement.scrollLeft = beforeScroll + scrollAmount

				const afterScroll = currentElement.scrollLeft
				const actualScrollDelta = afterScroll - beforeScroll

				if (Math.abs(actualScrollDelta) > 0.5) {
					scrollSuccess = true
					scrolledElement = currentElement
					scrollDelta = actualScrollDelta
					break
				}
			}

			if (currentElement === document.body || currentElement === document.documentElement) {
				break
			}
			currentElement = currentElement.parentElement
			attempts++
		}

		if (scrollSuccess) {
			return `Scrolled container (${scrolledElement?.tagName}) horizontally by ${scrollDelta}px`
		} else {
			return `No horizontally scrollable container found for element (${targetElement.tagName})`
		}
	}

	// Page-level scrolling (default or fallback)

	const dx = scroll_amount

	const bigEnough = (el: HTMLElement) => el.clientWidth >= window.innerWidth * 0.5
	const canScroll = (el: HTMLElement | null) =>
		el &&
		/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowX) &&
		el.scrollWidth > el.clientWidth &&
		bigEnough(el)

	// @deprecated Same heuristic container search as scrollVertically.
	// TODO: Remove once LLMs reliably use indexed scrolling via data-scrollable.

	let el: HTMLElement | null = document.activeElement as HTMLElement | null
	while (el && !canScroll(el) && el !== document.body) el = el.parentElement

	el = canScroll(el)
		? el
		: Array.from(document.querySelectorAll<HTMLElement>('*')).find(canScroll) ||
			(document.scrollingElement as HTMLElement) ||
			(document.documentElement as HTMLElement)

	if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
		// Page-level scroll
		const scrollBefore = window.scrollX
		const scrollMax = document.documentElement.scrollWidth - window.innerWidth

		window.scrollBy(dx, 0)

		const scrollAfter = window.scrollX
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dx > 0
				? `⚠️ Already at the right edge of the page, cannot scroll right further.`
				: `⚠️ Already at the left edge of the page, cannot scroll left further.`
		}

		const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1
		const reachedLeft = dx < 0 && scrollAfter <= 1

		if (reachedRight)
			return `✅ Scrolled page by ${scrolled}px. Reached the right edge of the page.`
		if (reachedLeft) return `✅ Scrolled page by ${scrolled}px. Reached the left edge of the page.`
		return `✅ Scrolled page horizontally by ${scrolled}px.`
	} else {
		// Container scroll
		const warningMsg = `The document is not scrollable. Falling back to container scroll.`
		console.log(`[PageController] ${warningMsg}`)

		const scrollBefore = el!.scrollLeft
		const scrollMax = el!.scrollWidth - el!.clientWidth

		el!.scrollBy({ left: dx, behavior: 'smooth' })
		await waitFor(0.1)

		const scrollAfter = el!.scrollLeft
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dx > 0
				? `⚠️ ${warningMsg} Already at the right edge of container (${el!.tagName}), cannot scroll right further.`
				: `⚠️ ${warningMsg} Already at the left edge of container (${el!.tagName}), cannot scroll left further.`
		}

		const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1
		const reachedLeft = dx < 0 && scrollAfter <= 1

		if (reachedRight)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the right edge.`
		if (reachedLeft)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the left edge.`
		return `✅ ${warningMsg} Scrolled container (${el!.tagName}) horizontally by ${scrolled}px.`
	}
}
