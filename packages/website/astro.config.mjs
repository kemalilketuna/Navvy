// @ts-check
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const SITE = 'https://navvy-extension.site'
const REPO = 'https://github.com/kemalilketuna/Navvy'

export default defineConfig({
	site: SITE,
	// Prefetch every link as it enters the viewport so docs clicks open instantly.
	prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
	vite: { plugins: [tailwindcss()] },
	integrations: [
		react(),
		starlight({
			title: 'Navvy',
			// SPA-like view transitions via a Head override that adds ClientRouter.
			components: { Head: './src/components/Head.astro' },
			description:
				'An AI agent that drives your browser. Tell it what to do — it does the clicking.',
			logo: { src: './public/logo.svg', alt: 'Navvy' },
			favicon: '/logo.svg',
			social: [{ icon: 'github', label: 'GitHub', href: REPO }],
			customCss: ['./src/styles/starlight.css'],
			// Docs are nested under a `docs/` segment so every route lives at /docs/*.
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'Overview', slug: 'docs/introduction/overview' },
						{ label: 'Quick Start', slug: 'docs/introduction/quick-start' },
						{ label: 'Privacy & Security', slug: 'docs/introduction/privacy-and-security' },
						{ label: 'Limitations', slug: 'docs/introduction/limitations' },
						{ label: 'Troubleshooting', slug: 'docs/introduction/troubleshooting' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'Models & Providers', slug: 'docs/features/models' },
						{ label: 'Voice Mode', slug: 'docs/features/voice' },
						{ label: 'Data Masking', slug: 'docs/features/data-masking' },
						{ label: 'Teach → Skills', slug: 'docs/features/skills' },
						{ label: 'Multi-Tab Automation', slug: 'docs/features/multi-tab' },
						{ label: 'Vision & Images', slug: 'docs/features/vision' },
						{ label: 'Conversation History', slug: 'docs/features/history' },
						{ label: 'Custom Instructions', slug: 'docs/features/custom-instructions' },
						{ label: 'Languages', slug: 'docs/features/languages' },
						{ label: 'Shortcuts', slug: 'docs/features/shortcuts' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Actions & Tools', slug: 'docs/reference/actions' },
						{ label: 'Settings', slug: 'docs/reference/settings' },
						{ label: 'Automation API (Hub & MCP)', slug: 'docs/reference/automation-api' },
					],
				},
				{
					label: 'Under the Hood',
					items: [
						{ label: 'Architecture', slug: 'docs/internals/architecture' },
						{ label: 'The Agent Loop', slug: 'docs/internals/agent-loop' },
						{ label: 'The DOM Pipeline', slug: 'docs/internals/dom-pipeline' },
						{ label: 'Action Execution', slug: 'docs/internals/action-execution' },
					],
				},
			],
		}),
	],
})
