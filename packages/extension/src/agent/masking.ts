/**
 * Data masking — keep sensitive values out of the LLM while still letting the
 * agent fill them into the page.
 *
 * Two directions:
 * - Outbound (page → LLM): `redactSensitive` swaps real values for `{{token}}`
 *   in the simplified page content (sensitive entries only).
 * - Inbound (LLM → page): the value-writing tool overlays in `createMaskingTools`
 *   swap `{{token}}` back to the real value just before it hits the DOM, and
 *   re-mask the resulting tool-result message so no real value is ever serialized
 *   back to the model.
 *
 * Non-sensitive entries (autofill: name, address, …) are detokenized inbound but
 * never redacted outbound — the model is allowed to see them.
 */
import { type PageAgentCore, type PageAgentTool, tool } from '@page-agent/core'
import * as z from 'zod/v4'

export interface MaskingEntry {
	/** uuid */
	id: string
	/** identifier the LLM sees, e.g. "credit_card", "addr_zip" */
	token: string
	/** human label for the settings UI, e.g. "Home postal code" */
	label: string
	/** the real value (stored locally only) */
	value: string
	enabled: boolean
	/**
	 * true: redact outbound AND fill inbound (card / SSN / password).
	 * false: fill inbound only, no redaction (address / name = autofill).
	 */
	sensitive: boolean
	/** optional grouping for structured data, e.g. "Home address" */
	group?: string
}

/** Token surface form exchanged with the LLM: `{{credit_card}}`. */
const TOKEN_RE = /\{\{([\w.-]+)\}\}/g

export function newMaskingId(): string {
	return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** An entry usable for masking: enabled, with a non-empty token and value. */
function isActive(e: MaskingEntry): boolean {
	return e.enabled && e.token.trim().length > 0 && e.value.length > 0
}

/** A row with no meaningful content — a leftover "Add entry" click, dropped on save. */
export function isEntryBlank(e: MaskingEntry): boolean {
	return !e.token.trim() && !e.value.trim() && !e.label.trim()
}

/** Required-field errors for a non-blank entry. Blank entries report no errors. */
export interface MaskingEntryErrors {
	token: boolean
	value: boolean
}

export function validateEntry(e: MaskingEntry): MaskingEntryErrors {
	if (isEntryBlank(e)) return { token: false, value: false }
	return { token: e.token.trim().length === 0, value: e.value.length === 0 }
}

/** Drop blank rows and report whether any remaining entry is missing a required field. */
export function normalizeEntries(entries: MaskingEntry[]): {
	entries: MaskingEntry[]
	valid: boolean
} {
	const kept = entries.filter((e) => !isEntryBlank(e))
	const valid = kept.every((e) => {
		const err = validateEntry(e)
		return !err.token && !err.value
	})
	return { entries: kept, valid }
}

export function activeEntries(entries: MaskingEntry[]): MaskingEntry[] {
	return entries.filter(isActive)
}

/** Replace `{{token}}` with the real value for known, active tokens. */
export function detokenize(text: string, entries: MaskingEntry[]): string {
	return text.replace(TOKEN_RE, (m, tok: string) => {
		const e = entries.find((x) => isActive(x) && x.token === tok)
		return e ? e.value : m // unknown token passes through untouched
	})
}

/**
 * Replace real values with `{{token}}` for sensitive entries. Used both for
 * outbound page content and for sanitizing tool-result messages. Longest values
 * first so a shorter value can't partially clobber a longer overlapping one.
 */
export function redactSensitive(text: string, entries: MaskingEntry[]): string {
	const sensitive = activeEntries(entries)
		.filter((e) => e.sensitive)
		.sort((a, b) => b.value.length - a.value.length)
	let result = text
	for (const e of sensitive) {
		result = result.split(e.value).join(`{{${e.token}}}`)
	}
	return result
}

/**
 * Instructions advertising the available tokens to the planner. Never includes
 * the real values. Returns undefined when there is nothing to advertise.
 */
export function buildMaskingInstructions(entries: MaskingEntry[]): string | undefined {
	const active = activeEntries(entries)
	if (active.length === 0) return undefined

	const lines = active.map((e) => {
		const group = e.group ? ` (${e.group})` : ''
		const flag = e.sensitive ? ' [sensitive — value hidden from you]' : ''
		return `- {{${e.token}}} — ${e.label}${group}${flag}`
	})

	return [
		"You can fill form fields with the user's saved data by typing a placeholder of the",
		'form {{token}} verbatim into a field. The extension substitutes the real value locally',
		'before it reaches the page; you never see the real value for sensitive entries. Match a',
		'field to a token by its label. Available tokens:',
		...lines,
	].join('\n')
}

/**
 * Overrides for the value-writing tools that detokenize inbound text and re-mask
 * outbound result messages. Keyed by the same names as the built-in tools so they
 * replace them via `customTools`.
 */
export function createMaskingTools(entries: MaskingEntry[]): Record<string, PageAgentTool> {
	const indexedText = z.object({
		index: z.number().int().min(0),
		text: z.string(),
	})

	return {
		input_text: tool({
			description:
				'Click and type text into an interactive input element. You may include {{token}} placeholders; the extension substitutes the real value locally.',
			inputSchema: indexedText,
			execute: async function (this: PageAgentCore, input: { index: number; text: string }) {
				const result = await this.pageController.inputText(
					input.index,
					detokenize(input.text, entries)
				)
				return redactSensitive(result.message, entries)
			},
		}),

		select_dropdown_option: tool({
			description:
				'Select dropdown option for interactive element index by the text of the option you want to select. You may include {{token}} placeholders; the extension substitutes the real value locally.',
			inputSchema: indexedText,
			execute: async function (this: PageAgentCore, input: { index: number; text: string }) {
				const result = await this.pageController.selectOption(
					input.index,
					detokenize(input.text, entries)
				)
				return redactSensitive(result.message, entries)
			},
		}),

		send_keys: tool({
			description:
				'Dispatch keyboard key combos to the focused element. Use for special keys like Enter, Tab, Escape, Backspace, Delete, ArrowUp/Down/Left/Right, or combos like "ctrl+a", "shift+Tab". Separate multiple combos with whitespace, e.g. "ctrl+a Delete".',
			inputSchema: z.object({ keys: z.string() }),
			requiresFullProvider: true,
			execute: async function (this: PageAgentCore, input: { keys: string }) {
				const result = await this.pageController.sendKeys(detokenize(input.keys, entries))
				return redactSensitive(result.message, entries)
			},
		}),
	}
}
