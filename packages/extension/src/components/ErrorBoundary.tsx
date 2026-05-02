import { AlertTriangle, Eraser, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { type ExtensionLanguage, detectLanguage } from '@/agent/MultiPageAgent'
import { Button } from '@/components/ui/button'
import { translate } from '@/lib/i18n'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
	language: ExtensionLanguage
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null, language: detectLanguage() }

	componentDidMount() {
		// Pick up persisted preference asynchronously so a thrown render uses it.
		chrome.storage.local.get('language').then((r) => {
			const stored = r.language as ExtensionLanguage | undefined
			if (stored) this.setState({ language: stored })
		})
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('[ErrorBoundary]', error, errorInfo.componentStack)
	}

	handleReload = () => {
		window.location.reload()
	}

	handleResetConfig = async () => {
		await chrome.storage.local.remove(['providerConfig', 'language', 'advancedConfig'])
		window.location.reload()
	}

	render() {
		if (!this.state.hasError) {
			return this.props.children
		}

		const t = (key: Parameters<typeof translate>[1]) => translate(this.state.language, key)
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center">
				<AlertTriangle className="size-12 text-destructive mb-4" />
				<h2 className="text-lg font-semibold mb-2">{t('ext.error.title')}</h2>
				<p className="text-sm text-muted-foreground mb-4 max-w-xs">
					{this.state.error?.message || t('ext.error.unexpected')}
				</p>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={this.handleResetConfig}>
						<Eraser className="size-3.5 mr-2" />
						{t('ext.error.resetConfig')}
					</Button>
					<Button variant="outline" size="sm" onClick={this.handleReload}>
						<RotateCcw className="size-3.5 mr-2" />
						{t('ext.error.reloadPanel')}
					</Button>
				</div>
			</div>
		)
	}
}
