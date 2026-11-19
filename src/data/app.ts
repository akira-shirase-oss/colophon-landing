// Where the app lives (the Studio): sign in, sign up and the dashboard. The account buttons appear only when
// PUBLIC_APP_URL is set at build time (D-200); unset, the header keeps "See the source", so the site never
// links to an app that isn't live. Set it in the Pages build settings when the app launches (README).
const base = import.meta.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, '')

export const app = base
  ? {
      signIn: `${base}/studio/signin`,
      signUp: `${base}/studio/signup`,
      dashboard: `${base}/studio/`,
    }
  : null

// The documentation site (guides, the API and tokens).
export const DOCS_URL = 'https://docs.colophon.404human.dev'

/** Where the header's Get started goes while the app isn't live: the docs' quick start. */
export const QUICK_START = `${DOCS_URL}/quick-start/`
