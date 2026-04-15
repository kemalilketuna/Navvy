import React from 'react'
import ReactDOM from 'react-dom/client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { I18nProvider } from '@/lib/i18n'

import App from './App'

import '@/assets/index.css'

// Navvy is dark-only.
document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<ErrorBoundary>
			<I18nProvider>
				<App />
				<Toaster />
			</I18nProvider>
		</ErrorBoundary>
	</React.StrictMode>
)
