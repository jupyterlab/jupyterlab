/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The part of the Babel configuration API that this configuration uses.
 */
interface IConfigAPI {
  /**
   * Read the options of the tool that calls Babel, such as babel-jest.
   */
  caller<T>(callback: (caller?: Record<string, unknown>) => T): T;
}

/**
 * Babel configuration for Jest.
 */
export default function babelConfig(api: IConfigAPI): { plugins: string[] } {
  // Like `@babel/preset-env`, skip what Jest runs itself, as in its ES module mode.
  const supports = (feature: string) =>
    api.caller(caller => !!caller?.[feature]);
  // Resolved from this package, so that projects using this configuration do not need to install the plugins.
  const plugins: string[] = [];
  if (!supports('supportsStaticESM')) {
    plugins.push(require.resolve('@babel/plugin-transform-modules-commonjs'));
    if (!supports('supportsDynamicImport')) {
      plugins.push(require.resolve('@babel/plugin-transform-dynamic-import'));
    }
  }
  if (!supports('supportsExportNamespaceFrom')) {
    plugins.push(
      require.resolve('@babel/plugin-transform-export-namespace-from')
    );
  }
  return { plugins };
}
