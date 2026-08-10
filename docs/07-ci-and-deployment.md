# CI and deployment

How the suite runs when nobody is watching, and how the demo it runs against
gets deployed.

## The pipeline

```
quality ──▶ playwright (3 shards) ──▶ report ──▶ publish-report (GitHub Pages)
                 │
                 └───────────────────▶ deploy (main only) ──▶ smoke (live URL)
```

`.github/workflows/ci.yml`, on every push to `main` and every pull request.

| Job              | What it proves                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `quality`        | ESLint (including the Playwright anti-flake rules), Prettier, TypeScript across all three tsconfigs, Vitest |
| `playwright`     | The full suite — API, four browser projects, a11y, visual — split across three shards                       |
| `report`         | Merges the shards' blob reports into one HTML report                                                        |
| `publish-report` | Publishes that report to GitHub Pages, from `main` only                                                     |
| `deploy`         | Builds and pushes the Worker to Cloudflare                                                                  |
| `smoke`          | Re-runs the `@smoke` tests against the deployed URL, not a local build                                      |

### Why the jobs are shaped this way

**`quality` runs before `playwright`, but its four checks don't gate each
other.** Each check after the first carries `if: ${{ !cancelled() }}`, so a
Prettier complaint doesn't hide a type error. One push should be able to fix
everything CI has to say.

**Sharding needs the blob reporter.** `playwright.config.ts` switches to
`[['blob'], ['github'], ['list']]` under CI. A blob report is an intermediate
format, not something a human reads — three shards each produce one, and
`merge-reports` turns all three into a single HTML report covering the whole
run, with correct totals and timings. The `github` reporter is what annotates
failures inline on the pull request diff.

**The report publishes even when the suite is red** (`if: always()`). A CI
report that only exists when everything passed is a trophy cabinet, not a
diagnostic.

**`deploy` needs `playwright`, so nothing ships that hasn't passed.** It's also
gated on `github.event_name == 'push' && github.ref == 'refs/heads/main'`, so
a pull request never deploys.

**`smoke` exists because passing against `vite preview` on a CI runner is not
the same claim as working when deployed.** Setting `BASE_URL` makes
`playwright.config.ts` skip its local `webServer` entirely, so those tests
drive the real Worker on Cloudflare's edge, with real network latency and the
real D1 binding. It catches the class of problem that only appears in
production: a missing secret, a broken asset path, a binding that wasn't
configured.

That smoke run seeds data through `/api/test/*`, against a live public site.
That's safe for exactly one reason — every test-support endpoint is scoped to
the caller's own session (`worker/middleware/session.ts`), so it can only touch
its own private copy of the catalog. A visitor browsing the demo at the same
moment is unaffected.

## Visual baselines: the platform problem

`toHaveScreenshot` resolves baselines per platform. Baselines generated on a
Windows dev machine are written as `…-win32.png`; a Linux CI run looks for
`…-linux.png`, finds nothing, and fails. The two sets can't be shared, because
Linux and Windows rasterise the same font at the same size differently enough
to blow past any threshold worth setting. (Loosening the threshold until both
platforms pass is the tempting fix and the wrong one: a threshold wide enough
to absorb a font-rendering difference is wide enough to absorb a real layout
regression.)

So Linux baselines have to be generated on Linux, on the same image CI compares
them on. `.github/workflows/visual-baselines.yml` does that: a manual
`workflow_dispatch` run that regenerates the `visual` project with
`--update-snapshots` and commits the resulting `-linux.png` files.

**Both workflows pin the same container image**
(`mcr.microsoft.com/playwright:v1.62.0-noble`). This is deliberate. GitHub's
`ubuntu-latest` runner image is updated regularly, and a font package changing
underneath a pixel comparison produces a failure that looks like an application
regression and isn't. A pinned image means visual baselines stay valid until
someone deliberately changes the pin. If `@playwright/test` is upgraded, the
image tag must move with it in both files, and the baselines must be
regenerated.

Both platforms' baselines live in the repo, so `npm run test:visual` still
works locally on Windows.

**The baseline commit does not trigger CI.** GitHub refuses to start workflow
runs from pushes authenticated with the default `GITHUB_TOKEN` — a recursion
guard, and a sensible one. After the baseline workflow succeeds, start CI by
hand from the Actions tab. This is why `deploy` and `publish-report` are gated
on `github.event_name != 'pull_request'` rather than `== 'push'`: a manually
started run has `event_name == 'workflow_dispatch'`, and gating on `push`
would skip exactly the jobs a post-baseline run exists to perform.

**Regenerating baselines is a review step, not a fix.** `--update-snapshots`
will bless a genuine regression as the new truth just as happily as an intended
redesign. That is the one way a visual suite can quietly stop testing anything,
which is why the workflow pushes a reviewable commit and uploads the PNGs as an
artefact rather than updating baselines silently as part of the normal run.

## Deployment

A single Cloudflare Worker serves both the SPA and the API, so "deploy" is one
`wrangler deploy` — there is no separate frontend host, no CORS configuration
and no second origin for tests to reason about.

`@cloudflare/vite-plugin` builds to `dist/`:

- `dist/client/` — the built SPA, uploaded as Worker static assets
- `dist/yarra_co/` — the bundled Worker, plus a **generated `wrangler.json`**

That generated config is the one to deploy with. It's the repo's
`wrangler.jsonc` with the build's asset directory filled in
(`assets.directory: "../client"`), which the repo config deliberately doesn't
set. Hence:

```bash
wrangler deploy --config dist/yarra_co/wrangler.json
```

which is what `npm run deploy` and the CI deploy job both run.

### Configuration, and one thing that must not be in it

`vars` in `wrangler.jsonc` are uploaded verbatim on every deploy, and the repo
is public. `AUTH_SECRET` — the HMAC key that signs admin auth tokens
(`worker/auth/token.ts`) — therefore lives in `.dev.vars` for local development
and as a Cloudflare secret in production:

```bash
wrangler secret put AUTH_SECRET
```

Had it stayed under `vars`, deploying would have published the key that mints
admin tokens. Tokens are bound to the caller's own data session, so the blast
radius is one visitor's own sandbox rather than anyone else's data — but
publishing a signing key is not a thing to do on purpose.

`.dev.vars` is committed on purpose. Its value is a throwaway HMAC key for a
demo whose data is per-session and disposable, and committing it keeps
`npm run dev` and the Playwright suite zero-config for anyone cloning the repo.

`ENABLE_TEST_API` stays `true` in production. `/api/test/*` can only read and
write the caller's own session, so it exposes nothing, and leaving it on is
what lets the post-deploy smoke job seed the data it needs against the live
site.

### Database

D1 needs no migration step in the pipeline. `ensureSchema` runs at the top of
the session middleware on every API request, so a freshly created database
bootstraps itself on first hit. The catalog is seeded per session, not globally,
which is the same mechanism that makes `fullyParallel: true` safe — see
`docs/08-selector-and-flake-policy.md`.

### One-time setup

Repository secrets:

| Secret                  | Where it comes from                                                        |
| ----------------------- | -------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare dashboard → My Profile → API Tokens → _Edit Cloudflare Workers_ |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Account ID                        |

Repository variable:

| Variable   | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| `DEMO_URL` | The deployed Worker URL, e.g. `https://yarra-co.<subdomain>.workers.dev` |

Plus, once:

```bash
wrangler login
wrangler d1 create yarra-co-db        # put the returned id in wrangler.jsonc
wrangler secret put AUTH_SECRET       # any long random string
```

and set **Settings → Pages → Source** to _GitHub Actions_ so `publish-report`
has somewhere to publish to.
