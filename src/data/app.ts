// Where the app lives (the Studio): sign in, sign up and the dashboard. Set PUBLIC_APP_URL at build time to
// point the landing at another deployment; the default is the planned app domain (D-200).
const base = (import.meta.env.PUBLIC_APP_URL ?? 'https://app.colophon.404human.dev').replace(/\/+$/, '')

// The documentation site (guides, the API and tokens).
export const DOCS_URL = 'https://docs.colophon.404human.dev'

export const app = {
  signIn: `${base}/studio/signin`,
  signUp: `${base}/studio/signup`,
  dashboard: `${base}/studio/`,
}
