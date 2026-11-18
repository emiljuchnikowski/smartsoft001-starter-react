const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');

const { join } = require('node:path');

// Bundles the API for Node. The `@smartsoft001/*` and `@app/*` imports resolve
// through the workspace tsconfig paths and end up in the bundle; third-party
// packages stay external and are listed in the generated package.json.
module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    // The executor set `libraryTarget: 'commonjs'` for Node before webpack
    // normalised the config; the plugin applies too late for that.
    library: { type: 'commonjs' },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      generatePackageJson: true,
      outputHashing: 'none',
      // The removed executor did not minify by default.
      optimization: false,
    }),
    // Runs after NxAppWebpackPlugin, as the callback composed after `withNx` did.
    {
      apply(compiler) {
        compiler.options.output = {
          ...compiler.options.output,
          ...(process.env.NODE_ENV !== 'production' && {
            clean: true,
            devtoolModuleFilenameTemplate: '[absolute-resource-path]',
          }),
        };
        compiler.options.devtool = 'source-map';
      },
    },
  ],
};
