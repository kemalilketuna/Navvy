/**
 * Skill refiner — turn a raw narration ("search for the thing and check out")
 * into a structured, parameterized {@link Skill} via a single forced-tool LLM
 * call. Used by both authoring paths: the settings Skills section (text) and the
 * side-panel Teach screen (voice transcript).
 */
import { LLM } from '@page-agent/llms'
import * as z from 'zod/v4'

import { type ParamSpec, type Skill, slugify } from './skills'

export interface RefineCredentials {
	baseURL: string
	model?: string
	apiKey?: string
}

export interface RefineInput {
	transcript: string
	/** URL of the page the narration was recorded on (suggests `urlPattern`). */
	url?: string
	/** When re-refining, the current skill so the model can keep good edits. */
	existing?: Pick<Skill, 'name' | 'description' | 'urlPattern' | 'parameters' | 'plan'>
}

/** The structured fields the refiner produces (everything except bookkeeping). */
export type RefinedSkill = Pick<
	Skill,
	'name' | 'description' | 'urlPattern' | 'triggerPhrases' | 'parameters' | 'plan'
>

const paramSchema = z.object({
	name: z.string().describe('A short identifier, e.g. "query" or "quantity".'),
	type: z.enum(['string', 'number', 'boolean']),
	description: z.string().describe('What this parameter is for.'),
	required: z.boolean(),
})

const skillSchema = z.object({
	name: z.string().describe('A short, tool-safe slug, e.g. "checkout_express".'),
	description: z.string().describe('One or two sentences: what the skill does and when to use it.'),
	urlPattern: z
		.string()
		.describe(
			'A glob like "*example.com/*" for pages where the skill applies. Empty string = any page.'
		),
	triggerPhrases: z
		.array(z.string())
		.describe('Optional natural-language phrases that should trigger this skill.'),
	parameters: z
		.array(paramSchema)
		.describe('Inputs the skill needs. Use {name} placeholders for them in the plan.'),
	plan: z
		.string()
		.describe(
			'Ordered, numbered steps in plain language for an agent to follow. Reference parameters as {name}.'
		),
})

const SYSTEM_PROMPT = [
	'You convert a user\'s narration of a web automation into a reusable, structured "skill".',
	'A skill is later executed by an autonomous browser agent that follows your plan step by step.',
	'',
	'Guidelines:',
	'- Produce concise, ordered, unambiguous steps. Each step is one concrete action.',
	'- Extract anything variable (search terms, quantities, names) into parameters and reference',
	'  them in the plan as {param_name}. Do not hardcode example values into the plan.',
	'- name must be a short snake_case slug. description says what it does and when to use it.',
	'- urlPattern should be a glob matching the site/section it applies to (e.g. "*amazon.*/*").',
	'  Use an empty string only when it truly applies to any page.',
	'- Keep the plan resilient to layout changes: describe targets by their visible label/role,',
	'  not by pixel positions or DOM indices.',
	'Call the emit_skill tool exactly once with the structured result.',
].join('\n')

function buildUserPrompt(input: RefineInput): string {
	const parts = [`Narration:\n${input.transcript.trim()}`]
	if (input.url) parts.push(`Recorded on page: ${input.url}`)
	if (input.existing) {
		parts.push(
			`Current structured skill (improve it, keep good parts):\n${JSON.stringify(
				input.existing,
				null,
				2
			)}`
		)
	}
	return parts.join('\n\n')
}

function normalizeParams(raw: unknown): ParamSpec[] {
	if (!Array.isArray(raw)) return []
	return raw
		.map((p) => ({
			name: String(p?.name ?? '').trim(),
			type: (['string', 'number', 'boolean'].includes(p?.type)
				? p.type
				: 'string') as ParamSpec['type'],
			description: String(p?.description ?? '').trim(),
			required: Boolean(p?.required),
		}))
		.filter((p) => p.name.length > 0)
}

export async function refineSkill(
	credentials: RefineCredentials,
	input: RefineInput
): Promise<RefinedSkill> {
	if (!input.transcript.trim()) {
		throw new Error('Narration is empty.')
	}
	if (!credentials.baseURL || !credentials.model) {
		throw new Error('Configure an AI provider first.')
	}

	const llm = new LLM({
		baseURL: credentials.baseURL,
		model: credentials.model,
		apiKey: credentials.apiKey,
	})

	const result = await llm.invoke(
		[
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: buildUserPrompt(input) },
		],
		{
			emit_skill: {
				description: 'Emit the structured skill.',
				inputSchema: skillSchema,
				execute: async (args: unknown) => args,
			},
		},
		new AbortController().signal,
		{ toolChoiceName: 'emit_skill' }
	)

	const args = result.toolCall.args as Partial<RefinedSkill>
	return {
		name: slugify((args.name ?? '').trim() || 'skill'),
		description: (args.description ?? '').trim(),
		urlPattern: (args.urlPattern ?? '').trim(),
		triggerPhrases: Array.isArray(args.triggerPhrases)
			? args.triggerPhrases.map((p) => p.trim()).filter(Boolean)
			: [],
		parameters: normalizeParams(args.parameters),
		plan: (args.plan ?? '').trim(),
	}
}
