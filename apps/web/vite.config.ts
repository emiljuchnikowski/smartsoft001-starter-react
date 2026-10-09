import { defineConfig, Plugin } from 'vite';

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The React frontend of the example application on Vite. Vite transforms the
 * TSX and the model's decorators with Oxc, which reads `jsx`,
 * `experimentalDecorators` and `emitDecoratorMetadata` from the tsconfig
 * chain, so no plugin is needed.
 *
 * `vite --mode demo` (`build:demo`, `serve-static:demo`) is the hosted demo:
 * served from /demo-react/ on GitHub Pages, with hash navigation and the
 * in-memory double of the API in place of the two files `DEMO_REPLACEMENTS`
 * names.
 */
const projectRoot = __dirname;
const workspaceRoot = resolve(projectRoot, '../..');

/** The files the `demo` build replaces: the navigation and the API providers. */
const DEMO_REPLACEMENTS: Record<string, string> = {
  'src/app/in-memory/in-memory-api.providers.ts':
    'src/app/in-memory/in-memory-api.providers.demo.ts',
  'src/app/navigation.ts': 'src/app/navigation.demo.ts',
};

/**
 * The path aliases of tsconfig.base.json, matched exactly: `@app/model`, and
 * inside the monorepo every `@smartsoft001/*` package, resolved to its
 * sources. Outside the monorepo the packages come from node_modules.
 */
function tsconfigAliases(): { find: RegExp; replacement: string }[] {
  const tsconfig = JSON.parse(
    readFileSync(join(workspaceRoot, 'tsconfig.base.json'), 'utf8'),
  );
  const paths: Record<string, string[]> = tsconfig.compilerOptions.paths ?? {};

  return Object.entries(paths).map(([name, [target]]) => ({
    find: new RegExp(`^${name.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    replacement: join(workspaceRoot, target),
  }));
}

/**
 * The published packages ship a compiled `styles.css`; the sources do not.
 * When the packages resolve to their sources, the stylesheets come from the
 * project's `styles` target, which compiles them with the same Tailwind
 * command the packages' builds use.
 */
function compiledStylesAliases(): { find: string; replacement: string }[] {
  const compiled = join(workspaceRoot, 'dist/styles-react');

  return ['react', 'crud-shell-react'].map((name) => ({
    find: `@smartsoft001/${name}/styles.css`,
    replacement: join(compiled, `${name}.css`),
  }));
}

function fileReplacements(replacements: Record<string, string>): Plugin {
  const absolute = new Map(
    Object.entries(replacements).map(([from, to]) => [
      join(projectRoot, from),
      join(projectRoot, to),
    ]),
  );

  return {
    name: 'example-app-file-replacements',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });

      return resolved && absolute.has(resolved.id)
        ? absolute.get(resolved.id)
        : null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  const usesSources = tsconfigAliases().some(({ find }) =>
    find.test('@smartsoft001/react'),
  );

  return {
    root: projectRoot,
    // GitHub Pages serves the demo under /demo-react/ next to the docs.
    base: demo ? '/demo-react/' : '/',
    // Pages has no SPA fallback, so neither has the demo's preview.
    appType: demo ? 'mpa' : 'spa',
    plugins: demo ? [fileReplacements(DEMO_REPLACEMENTS)] : [],
    resolve: {
      alias: [
        ...(usesSources ? compiledStylesAliases() : []),
        ...tsconfigAliases(),
      ],
    },
    // No PostCSS step: the framework's stylesheets are already compiled and
    // the app's own stylesheet is plain CSS.
    css: { postcss: {} },
    build: {
      outDir: demo
        ? join(
            workspaceRoot,
            'dist/apps/web-demo/demo-react',
          )
        : join(workspaceRoot, 'dist/apps/web'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 3000,
    },
    server: {
      port: 4300,
      strictPort: true,
      // The API: the dev server forwards /api to the NestJS server.
      proxy: { '/api': { target: 'http://localhost:3000', secure: false } },
    },
    preview: { port: 4300, strictPort: true },
  };
});
