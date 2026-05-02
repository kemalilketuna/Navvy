/**
 * Teach → Skills — reusable, parameterized automations the planner can invoke on
 * matching pages.
 *
 * Two complementary mechanisms (see voice-teach-masking.md, Phase D):
 * - Invocation: every enabled skill becomes a `skill_<slug>` custom tool whose
 *   input schema is built from its `parameters`. Its `execute` injects the
 *   skill's interpolated `plan` as a guided natural-language sub-task — the
 *   existing step loop carries it out (no brittle index replay).
 * - Discovery: `buildSkillInstructions(skills, url)` lists only the skills whose
 *   `urlPattern` matches the current URL, so the planner is told about a skill
 *   only on pages where it applies.
 *
 * Tools are registered once at construction (the registry isn't mutated
 * mid-task); per-step visibility is gated through `getPageInstructions`.
 */
import { type PageAgentCore, type PageAgentTool, tool } from '@page-agent/core'
import * as z from 'zod/v4'

export type ParamType = 'string' | 'number' | 'boolean'

export interface ParamSpec {
	name: string
	type: ParamType
	description: string
	required: boolean
}

export interface Skill {
	id: string
	/** tool-safe slug, e.g. "checkout_express" */
	name: string
	/** what it does + when to use it (for planner discovery) */
	description: string
	/** glob (`*`) or `/regex/` of pages where it applies; empty = everywhere */
	urlPattern: string
	/** optional natural-language trigger hints */
	triggerPhrases?: string[]
	/** typed inputs */
	parameters: ParamSpec[]
	/** ordered natural-language steps the sub-agent follows */
	plan: string
	/** raw narration, kept for re-refinement */
	sourceTranscript: string
	enabled: boolean
	createdAt: number
}

export function newSkillId(): string {
	return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Slugify a name into a tool-safe identifier. */
export function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 48) || 'skill'
	)
}

function isActive(s: Skill): boolean {
	return s.enabled && s.name.trim().length > 0 && s.plan.trim().length > 0
}

export function activeSkills(skills: Skill[]): Skill[] {
	return skills.filter(isActive)
}

/**
 * Does `url` match a skill's `urlPattern`? Empty pattern matches everything.
 * `/.../ ` is treated as a regex; otherwise the pattern is a glob where `*`
 * matches any run of characters and is tested as an unanchored substring so
 * `example.com` matches `https://example.com/cart`.
 */
export function urlMatchesPattern(url: string, pattern: string): boolean {
	const p = pattern.trim()
	if (!p) return true
	if (!url) return false
	try {
		if (p.length > 1 && p.startsWith('/') && p.endsWith('/')) {
			return new RegExp(p.slice(1, -1), 'i').test(url)
		}
		const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')
		return new RegExp(escaped, 'i').test(url)
	} catch {
		// Malformed pattern: fall back to a case-insensitive substring test.
		return url.toLowerCase().includes(p.toLowerCase())
	}
}

/** Build the per-skill Zod input schema from its declared parameters. */
function buildParamsSchema(parameters: ParamSpec[]): z.ZodType<Record<string, unknown>> {
	const shape: Record<string, z.ZodType> = {}
	for (const param of parameters) {
		const name = param.name.trim()
		if (!name) continue
		let field: z.ZodType =
			param.type === 'number' ? z.number() : param.type === 'boolean' ? z.boolean() : z.string()
		if (param.description.trim()) field = field.describe(param.description.trim())
		if (!param.required) field = field.optional()
		shape[name] = field
	}
	return z.object(shape) as z.ZodType<Record<string, unknown>>
}

/** Stringify a skill argument (always a primitive per the param schema) safely. */
function argToString(value: unknown): string {
	switch (typeof value) {
		case 'string':
			return value
		case 'number':
		case 'boolean':
		case 'bigint':
			return String(value)
		default:
			return value == null ? '' : JSON.stringify(value)
	}
}

/** Interpolate `{name}` placeholders in a plan with the provided argument values. */
function interpolatePlan(plan: string, args: Record<string, unknown>): string {
	return plan.replace(/\{(\w+)\}/g, (m, key: string) =>
		args[key] != null ? argToString(args[key]) : m
	)
}

/** Summarize the provided arguments for the guided sub-task message. */
function describeArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args).filter(([, v]) => v != null && v !== '')
	if (entries.length === 0) return ''
	const lines = entries.map(([k, v]) => `- ${k}: ${argToString(v)}`)
	return `\n\nParameter values:\n${lines.join('\n')}`
}

/**
 * Assign a stable, de-duped `skill_<slug>` tool name to every active skill.
 * Computed over the full active set so the name is identical wherever it's used
 * — tool registration and per-URL instructions must agree, or the planner would
 * be told to call a name that isn't registered.
 */
export function assignSkillToolNames(skills: Skill[]): { skill: Skill; toolName: string }[] {
	const used = new Set<string>()
	return activeSkills(skills).map((skill) => {
		const base = `skill_${slugify(skill.name)}`
		let toolName = base
		let suffix = 2
		while (used.has(toolName)) toolName = `${base}_${suffix++}`
		used.add(toolName)
		return { skill, toolName }
	})
}

/**
 * Register a `skill_<slug>` tool for every enabled skill. The tool injects the
 * interpolated plan as authoritative, ordered instructions for the next steps;
 * the existing planner/executor carries them out. A call on a non-matching URL
 * is a no-op with an explanatory message.
 */
export function createSkillTools(skills: Skill[]): Record<string, PageAgentTool> {
	const tools: Record<string, PageAgentTool> = {}

	for (const { skill, toolName } of assignSkillToolNames(skills)) {
		const description = [
			skill.description.trim() || `Run the "${skill.name}" skill.`,
			skill.urlPattern.trim() ? `Applies to pages matching: ${skill.urlPattern}.` : '',
			'Invokes a saved, multi-step automation; follow its returned plan with the page tools.',
		]
			.filter(Boolean)
			.join(' ')

		tools[toolName] = tool({
			description,
			inputSchema: buildParamsSchema(skill.parameters),
			requiresFullProvider: true,
			execute: async function (this: PageAgentCore, args: Record<string, unknown>) {
				let url = ''
				try {
					url = (await this.pageController.getBrowserState())?.url ?? ''
				} catch {
					// If we can't read the URL, don't block the skill.
				}
				if (skill.urlPattern.trim() && url && !urlMatchesPattern(url, skill.urlPattern)) {
					return `The "${skill.name}" skill is not available on this page. It applies to pages matching: ${skill.urlPattern}.`
				}
				const steps = interpolatePlan(skill.plan, args ?? {})
				return [
					`Executing the "${skill.name}" skill. Carry out these steps in order using the available page tools, then call done with a short summary:`,
					'',
					steps,
					describeArgs(args ?? {}),
				]
					.join('\n')
					.trim()
			},
		})
	}

	return tools
}

/**
 * Instructions advertising the skills that apply to the current URL. Returns
 * undefined when none match, so the planner only hears about a skill on pages
 * where it's usable.
 */
export function buildSkillInstructions(skills: Skill[], url: string): string | undefined {
	const matching = assignSkillToolNames(skills).filter(
		({ skill }) => !skill.urlPattern.trim() || urlMatchesPattern(url, skill.urlPattern)
	)
	if (matching.length === 0) return undefined

	const lines = matching.map(({ skill, toolName }) => {
		const params = skill.parameters
			.filter((p) => p.name.trim())
			.map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}`)
			.join(', ')
		const paramText = params ? ` (parameters: ${params})` : ''
		return `- ${toolName} — ${skill.description.trim() || skill.name}${paramText}`
	})

	return [
		'Saved skills available on this page. Prefer calling one of these tools when it matches the',
		'user request; it runs a vetted multi-step automation:',
		...lines,
	].join('\n')
}
