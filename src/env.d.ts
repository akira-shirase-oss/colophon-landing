declare namespace App {
  /** What the Pages worker hands the on-demand routes (adapter/worker.mjs). Empty for every built page. */
  interface Locals {
    /** The deployment's own `COLOPHON_API`, `COLOPHON_PROJECT` and `COLOPHON_ENVIRONMENT`, where it sets them. */
    colophon?: { api?: string; project?: string; environment?: string }
    /** The site's static files, to ask whether a page exists. */
    assets?: { fetch(request: Request): Promise<Response> }
  }
}
