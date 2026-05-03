// Canonical Navvy URLs. Change here once; every link in the UI follows.
export const NAVVY_SITE = 'https://navvy-extension.site'
export const NAVVY_DOCS = `${NAVVY_SITE}/docs`
export const NAVVY_REPO = 'https://github.com/kemalilketuna/Navvy'

export const NAVVY_LINKS = {
	site: NAVVY_SITE,
	docs: NAVVY_DOCS,
	repo: NAVVY_REPO,
	issues: `${NAVVY_REPO}/issues`,
	mcp: `${NAVVY_REPO}/tree/main/packages/mcp`,
	terms: `${NAVVY_DOCS}/legal/terms-and-privacy`,
} as const
