import { Copy, ExternalLink, Eye, EyeOff, HatGlasses, Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { siGithub } from 'simple-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n'
import { NAVVY_LINKS } from '@/lib/links'

export function AboutSection() {
	const t = useT()
	const [userAuthToken, setUserAuthToken] = useState('')
	const [showToken, setShowToken] = useState(false)
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		let interval: NodeJS.Timeout | null = null

		const fetchToken = async () => {
			const result = await chrome.storage.local.get('PageAgentExtUserAuthToken')
			const token = result.PageAgentExtUserAuthToken
			if (typeof token === 'string' && token) {
				setUserAuthToken(token)
				if (interval) {
					clearInterval(interval)
					interval = null
				}
			}
		}

		fetchToken()
		interval = setInterval(fetchToken, 1000)

		return () => {
			if (interval) clearInterval(interval)
		}
	}, [])

	const handleCopyToken = async () => {
		if (userAuthToken) {
			await navigator.clipboard.writeText(userAuthToken)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	return (
		<div className="flex flex-col gap-6 max-w-xl">
			<div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-md border">
				<label htmlFor="user-auth-token" className="text-sm font-medium">
					{t('ext.config.userAuthToken')}
				</label>
				<p className="text-xs text-muted-foreground">{t('ext.config.userAuthTokenHelp')}</p>
				<div className="flex gap-2 items-center mt-1">
					<Input
						id="user-auth-token"
						readOnly
						value={
							userAuthToken
								? showToken
									? userAuthToken
									: `${userAuthToken.slice(0, 4)}${'•'.repeat(Math.max(0, userAuthToken.length - 8))}${userAuthToken.slice(-4)}`
								: t('ext.config.loading')
						}
						className="text-sm h-9 font-mono bg-background"
					/>
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9 shrink-0 cursor-pointer"
						onClick={() => setShowToken(!showToken)}
						disabled={!userAuthToken}
						aria-label={showToken ? t('ext.config.hideToken') : t('ext.config.showToken')}
						aria-pressed={showToken}
					>
						{showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9 shrink-0 cursor-pointer"
						onClick={handleCopyToken}
						disabled={!userAuthToken}
						aria-label={t('ext.config.copyToken')}
					>
						{copied ? <span>✓</span> : <Copy className="size-4" />}
					</Button>
					<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
						{copied ? t('ext.config.tokenCopied') : ''}
					</span>
				</div>
			</div>

			<a
				href="/hub.html"
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center justify-between p-4 rounded-md border bg-muted/50 text-sm font-medium hover:border-foreground/20 transition-colors"
			>
				{t('ext.config.manageHub')}
				<ExternalLink className="size-4" />
			</a>

			<div className="flex flex-col gap-3 pt-2 text-sm text-muted-foreground">
				<div className="flex justify-between">
					<span>{t('ext.config.version')}</span>
					<span className="font-mono">v{__VERSION__}</span>
				</div>
				<a
					href={NAVVY_LINKS.repo}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 hover:text-foreground"
				>
					<svg role="img" viewBox="0 0 24 24" className="size-4 fill-current">
						<path d={siGithub.path} />
					</svg>
					<span>{t('ext.config.sourceCode')}</span>
				</a>
				<a
					href={NAVVY_LINKS.site}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 hover:text-foreground"
				>
					<Home className="size-4" />
					<span>{t('ext.config.homePage')}</span>
				</a>
				<a
					href={NAVVY_LINKS.terms}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 hover:text-foreground"
				>
					<HatGlasses className="size-4" />
					<span>{t('ext.config.privacy')}</span>
				</a>
			</div>
		</div>
	)
}
