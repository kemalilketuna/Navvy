import { describe, expect, it } from 'vitest'

import {
	type Skill,
	buildSkillInstructions,
	createSkillTools,
	slugify,
	urlMatchesPattern,
} from './skills'

function skill(p: Partial<Skill>): Skill {
	return {
		id: p.id ?? 'id',
		name: p.name ?? 'do_thing',
		description: p.description ?? 'Do the thing',
		urlPattern: p.urlPattern ?? '',
		triggerPhrases: p.triggerPhrases,
		parameters: p.parameters ?? [],
		plan: p.plan ?? '1. Click the button',
		sourceTranscript: p.sourceTranscript ?? '',
		enabled: p.enabled ?? true,
		createdAt: p.createdAt ?? 0,
	}
}

describe('slugify', () => {
	it('produces a tool-safe slug', () => {
		expect(slugify('Express Checkout!')).toBe('express_checkout')
		expect(slugify('  weird  -- name  ')).toBe('weird_name')
	})

	it('falls back to "skill" when empty', () => {
		expect(slugify('!!!')).toBe('skill')
	})
})

describe('urlMatchesPattern', () => {
	it('matches everything for an empty pattern', () => {
		expect(urlMatchesPattern('https://a.com', '')).toBe(true)
	})

	it('treats * as a wildcard substring match', () => {
		expect(urlMatchesPattern('https://shop.example.com/cart', '*example.com/*')).toBe(true)
		expect(urlMatchesPattern('https://other.org/cart', '*example.com/*')).toBe(false)
	})

	it('supports /regex/ patterns', () => {
		expect(urlMatchesPattern('https://example.com/checkout', '/checkout$/')).toBe(true)
		expect(urlMatchesPattern('https://example.com/cart', '/checkout$/')).toBe(false)
	})
})

describe('createSkillTools', () => {
	it('registers one slugged tool per enabled skill and de-dupes names', () => {
		const tools = createSkillTools([
			skill({ id: '1', name: 'Buy Now' }),
			skill({ id: '2', name: 'Buy Now' }),
			skill({ id: '3', name: 'Skip', enabled: false }),
		])
		expect(Object.keys(tools).sort()).toEqual(['skill_buy_now', 'skill_buy_now_2'])
	})

	it('injects the interpolated plan as a guided sub-task on a matching page', async () => {
		const tools = createSkillTools([
			skill({
				name: 'search',
				urlPattern: '*example.com/*',
				plan: 'Search for {query} then open the first result',
				parameters: [{ name: 'query', type: 'string', description: 'term', required: true }],
			}),
		])
		const ctx = {
			pageController: {
				async getBrowserState() {
					return { url: 'https://example.com/home' }
				},
			},
		}
		const result = await tools.skill_search.execute.call(ctx as never, { query: 'shoes' })
		expect(result).toContain('Search for shoes then open the first result')
		expect(result).toContain('query: shoes')
	})

	it('no-ops with an explanation on a non-matching page', async () => {
		const tools = createSkillTools([
			skill({ name: 'search', urlPattern: '*example.com/*', plan: 'do it' }),
		])
		const ctx = {
			pageController: {
				async getBrowserState() {
					return { url: 'https://other.org/home' }
				},
			},
		}
		const result = await tools.skill_search.execute.call(ctx as never, {})
		expect(result).toContain('not available on this page')
	})
})

describe('buildSkillInstructions', () => {
	it('advertises only skills matching the current URL', () => {
		const skills = [
			skill({ name: 'a', urlPattern: '*example.com/*', description: 'On example' }),
			skill({ name: 'b', urlPattern: '*other.org/*', description: 'On other' }),
		]
		const text = buildSkillInstructions(skills, 'https://example.com/x')!
		expect(text).toContain('skill_a')
		expect(text).not.toContain('skill_b')
	})

	it('returns undefined when none match', () => {
		const skills = [skill({ name: 'a', urlPattern: '*example.com/*' })]
		expect(buildSkillInstructions(skills, 'https://nope.org')).toBeUndefined()
	})

	it('advertises the same tool name that is registered for same-named skills on different URLs', () => {
		// Two skills slug to "skill_search"; the second is registered as skill_search_2.
		// Instructions on the second skill's page must advertise skill_search_2, not skill_search.
		const skills = [
			skill({ id: '1', name: 'search', urlPattern: '*a.com/*' }),
			skill({ id: '2', name: 'search', urlPattern: '*b.com/*' }),
		]
		const tools = createSkillTools(skills)
		expect(Object.keys(tools).sort()).toEqual(['skill_search', 'skill_search_2'])

		const onB = buildSkillInstructions(skills, 'https://b.com/x')!
		expect(onB).toContain('skill_search_2')
		// The bare name belongs to skill 1 (a.com) and must not appear on b.com.
		expect(onB).not.toMatch(/skill_search\b(?!_2)/)
	})
})
