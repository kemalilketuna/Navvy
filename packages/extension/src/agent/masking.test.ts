import { describe, expect, it } from 'vitest'

import {
	type MaskingEntry,
	buildMaskingInstructions,
	createMaskingTools,
	detokenize,
	redactSensitive,
} from './masking'

function entry(p: Partial<MaskingEntry>): MaskingEntry {
	return {
		id: p.id ?? 'id',
		token: p.token ?? 'tok',
		label: p.label ?? 'Label',
		value: p.value ?? 'value',
		enabled: p.enabled ?? true,
		sensitive: p.sensitive ?? true,
		group: p.group,
	}
}

describe('detokenize', () => {
	it('replaces known tokens with their real value', () => {
		const entries = [entry({ token: 'credit_card', value: '4111111111111111' })]
		expect(detokenize('My card is {{credit_card}}', entries)).toBe('My card is 4111111111111111')
	})

	it('passes unknown tokens through untouched', () => {
		expect(detokenize('{{unknown}}', [])).toBe('{{unknown}}')
	})

	it('ignores disabled or empty entries', () => {
		const entries = [
			entry({ token: 'a', value: 'x', enabled: false }),
			entry({ token: 'b', value: '' }),
		]
		expect(detokenize('{{a}} {{b}}', entries)).toBe('{{a}} {{b}}')
	})
})

describe('redactSensitive', () => {
	it('masks sensitive values, leaving non-sensitive ones visible', () => {
		const entries = [
			entry({ token: 'ssn', value: '123-45-6789', sensitive: true }),
			entry({ token: 'name', value: 'Jane Doe', sensitive: false }),
		]
		const masked = redactSensitive('123-45-6789 belongs to Jane Doe', entries)
		expect(masked).toBe('{{ssn}} belongs to Jane Doe')
	})

	it('replaces longer values before shorter overlapping ones', () => {
		const entries = [
			entry({ token: 'full', value: '4111 1111', sensitive: true }),
			entry({ token: 'part', value: '4111', sensitive: true }),
		]
		expect(redactSensitive('4111 1111', entries)).toBe('{{full}}')
	})
})

describe('createMaskingTools input_text override', () => {
	it('detokenizes inbound text but never echoes the real value back', async () => {
		const entries = [entry({ token: 'credit_card', value: '4111111111111111' })]
		const tools = createMaskingTools(entries)

		let typed: string | undefined
		const ctx = {
			pageController: {
				async inputText(_index: number, text: string) {
					typed = text
					// PageController normally echoes the typed text in its message.
					return { success: true, message: `✅ Input text (${text}) into element (7).` }
				},
			},
		}

		const result = await tools.input_text.execute.call(ctx as never, {
			index: 7,
			text: '{{credit_card}}',
		})

		// Real value reached the DOM…
		expect(typed).toBe('4111111111111111')
		// …but never leaked back into the tool result.
		expect(result).not.toContain('4111111111111111')
		expect(result).toContain('{{credit_card}}')
	})
})

describe('buildMaskingInstructions', () => {
	it('lists tokens and labels but never the values', () => {
		const entries = [entry({ token: 'credit_card', label: 'Primary card', value: 'SECRET' })]
		const instructions = buildMaskingInstructions(entries)!
		expect(instructions).toContain('{{credit_card}}')
		expect(instructions).toContain('Primary card')
		expect(instructions).not.toContain('SECRET')
	})

	it('returns undefined when there are no active entries', () => {
		expect(buildMaskingInstructions([])).toBeUndefined()
	})
})
