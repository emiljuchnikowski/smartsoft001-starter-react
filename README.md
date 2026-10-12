# smartsoft001 React starter

One entity, the whole loop, on `@smartsoft001/react-stack@2.205.0` and
`@smartsoft001/nestjs-stack@2.205.0`: a React frontend on `@smartsoft001/crud-shell-react` with a
list page, an item page and a login, and a NestJS API on `@smartsoft001/crud-shell-nestjs`,
`@smartsoft001/mongo` and `@smartsoft001/auth-shell-nestjs`. It is the smallest application that
still uses the framework end to end, as a workspace of its own.

This repository is generated. The `Publish` workflow of the framework repository writes it from
`docs/examples/app` on every release, with the React frontend of that application, pins it to the
packages of that release, installs, builds and tests the result from a clean clone, and pushes
one commit per release. Fix the application in the framework repository and the next release
regenerates the starter; a change made here is overwritten. The application is explained line by
line on the Example application page:
https://framework.smartflow.biz.pl/docs/example-app

## Prerequisites

- Node.js 22.12 or newer (26 is what CI uses) and npm 10 or newer
- Docker with Compose (`docker compose version`)

## Run it

```bash
npm install

# 1. MongoDB and the API on http://localhost:3000/api
./run.sh up

# 2. The frontend on http://localhost:4300 (proxies /api to the container)
./run.sh web
```

3. Open http://localhost:4300 and sign in with `admin@example.com` / `change-me`, the user the API
   seeds on its first start.

What you will see: the login page, then an empty **Notes** list. **Add** opens the generated form
(a required title and a rich-text body), **Add** on that page saves the note and returns to the
list, and the arrow on a row opens the note read-only, where **Edit** turns it into the form again
and **Save** writes the change. **Remove** on a row deletes it. Every screen is generated from the
`@Field` decorators on the model and the `CrudFullConfig` object; the app itself is a handful of
small components.

The API needs no configuration to start. To change ports, the database name, the JWT secret or the
seeded user, copy `.env.example` to `.env` next to `docker-compose.yml`; Compose reads it and passes
the values to the container. Without Docker, start MongoDB yourself and run the API with the same
variables in the shell: `npx nx serve api`.

## Tests

```bash
# Jest: the model, the API services, the React services and pages
./run.sh test

# Playwright, against MongoDB on localhost:27017 (the API and the frontend are started for you)
./run.sh e2e
```

The Playwright suite sits behind `RUN_EXAMPLE_APP_E2E` so that a plain `nx run-many -t test` does
not require MongoDB; `./run.sh e2e` sets the variable, and the CI workflow in
`.github/workflows/ci.yml` sets it and provides the database. `npx nx e2e web-e2e` runs the suite
unconditionally.

`npx nx run-many -t lint` runs ESLint on every project, with the rules in `eslint.config.mjs`.

## What is where

| Path                                       | What it is                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `libs/model/src/lib/note.model.ts`         | The entity, decorated with `@Model` and `@Field`. Shared by both apps through the `@app/model` alias.                            |
| `apps/api/src/app/app.module.ts`           | The whole backend: TypeORM for the users, the auth module (`POST /api/token`), the CRUD module mounted under `/api/notes`.        |
| `apps/api/src/app/users.seed.ts`           | Inserts the one user at startup so that login works at once.                                                                     |
| `apps/api/src/config.ts`                   | The environment variables the API reads, with the defaults from `.env.example`.                                                  |
| `apps/web/src/main.tsx`                    | The entry point: `reflect-metadata`, the framework stylesheets, then the app inside `AppProviders`.                              |
| `apps/web/src/app/app.providers.tsx`       | One `SmartProvider`: the translations, the navigation, and the HTTP client and `AuthService` the screens use.                    |
| `apps/web/src/app/app.routes.tsx`          | The routes without a router: the login page, and the notes pages behind the guard.                                               |
| `apps/web/src/app/notes/notes.config.ts`   | The `CrudFullConfig` that says what the notes screens can do.                                                                    |
| `apps/web/src/app/notes/notes.feature.tsx` | `CrudProvider` and `SmartCrudPages`: the list, add and item pages.                                                               |
| `apps/web/src/app/auth/`                   | The login page on `SmartSignInForm`, the login service and the guard.                                                            |
| `apps/web/vite.config.ts`                  | Vite: the dev server on port 4300 and its `/api` proxy, the build, and the `demo` mode on an in-memory double of the API.        |
| `apps/web-e2e/src/`                        | Playwright: login, list, item page, against the running stack.                                                                   |
| `docker-compose.yml`, `Dockerfile`         | MongoDB plus the API built from this repository.                                                                                 |
| `run.sh`                                   | `up`, `web`, `test` and `e2e`: the commands above, in one script.                                                                |
| `eslint.config.mjs`                        | The ESLint rules every project extends: the Nx configs and the import order.                                                     |
| `.github/workflows/ci.yml`                 | Lint, build, Jest and the Playwright suite against a MongoDB service, on every push and pull request.                            |

## Upgrade

The framework ships its migrations with `@smartsoft001/core`, so an upgrade is the Nx one:

```bash
npx nx migrate @smartsoft001/core@<next>
npm install
npx nx migrate --run-migrations
```

The first command bumps every `@smartsoft001` package in `package.json` and writes
`migrations.json`, the second installs them, the third applies the migrations to the workspace.

## How the pieces fit

- The frontend calls `/api/...`; in development the Vite dev server proxies that to port 3000
  (`server.proxy` in `apps/web/vite.config.ts`), so there is no environment file on the frontend.
- Login is the OAuth password grant of `@smartsoft001/auth-shell-nestjs`: `POST /api/token` with the
  seeded username, the password and the `client_id` the API accepts. The returned JWT is stored by
  `AuthService` from `@smartsoft001/react`, and the HTTP client of `SmartProvider` sends it as a
  bearer header with every request.
- There is no router: `AppRoutes` reads the URL of the navigation adapter, `matchCrudRoute` matches
  `/notes`, `/notes/add` and `/notes/:id`, and `SmartCrudPages` renders the page for it.
- `reflect-metadata` is imported first in `main.tsx`: the model's decorators store their metadata
  with `Reflect`. Vite compiles the TSX and the decorators from the tsconfig, with no plugin.
- The CRUD routes come from one `@Controller('')` in `@smartsoft001/crud-shell-nestjs`; the API mounts
  it with NestJS's `RouterModule` under `notes`, which is why `apiUrl` in the frontend is `/api/notes`.
- Writes require the `admin` permission, reads `admin` or `user`; the seeded user has `admin`.
- The framework's stylesheets (Tailwind utilities under the `smart:` prefix) are the `styles.css` each
  UI package publishes: `main.tsx` imports `@smartsoft001/react/styles.css` and
  `@smartsoft001/crud-shell-react/styles.css`, then the app's own `styles.css`.
