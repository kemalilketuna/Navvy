#!/usr/bin/env node
/**
 * Full build pipeline. Equivalent to:
 *   pnpm run cleanup && pnpm --recursive --if-present run build
 *                     && pnpm --filter @page-agent/website run build:website
 *                     && pnpm --filter @page-agent/ext run zip
 *
 * 1. cleanup
 * 2. build everything in parallel (libs + website + extension)
 */
import chalk from 'chalk'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { parallelTask } from './parallel-task.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))

// Step 1: cleanup
console.log(chalk.bgBlue.white.bold(' ▸ cleanup '))
execSync('pnpm run cleanup', { cwd: rootDir, stdio: 'inherit' })

// Step 2: build all in parallel
console.log(chalk.bgBlue.white.bold(' ▸ build '))
const tasks = rootPkg.workspaces
	.map((ws) => {
		const dir = join(rootDir, ws)
		const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
		return pkg.scripts?.build ? { label: pkg.name, command: 'pnpm run build', cwd: dir } : null
	})
	.filter(Boolean)

tasks.push(
	{
		label: '@navvy/website',
		command: 'pnpm run build:website',
		cwd: join(rootDir, 'packages/website'),
	},
	{ label: '@page-agent/ext', command: 'pnpm run zip', cwd: join(rootDir, 'packages/extension') }
)

await parallelTask(tasks, { timeoutMs: 120_000 })
