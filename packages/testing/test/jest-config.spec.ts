// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const jestConfig = require('@jupyterlab/testing/lib/jest-config');

/**
 * Whether the `transformIgnorePatterns` of a configuration let Jest transform a file.
 */
function isTransformed(
  config: { transformIgnorePatterns: string[] },
  filePath: string
): boolean {
  return !new RegExp(config.transformIgnorePatterns.join('|')).test(filePath);
}

describe('jest-config', () => {
  const config = jestConfig('/ext');

  it('should transform a listed package', () => {
    expect(isTransformed(config, '/ext/node_modules/yjs/dist/yjs.cjs')).toBe(
      true
    );
  });

  it('should not transform an unlisted package', () => {
    expect(isTransformed(config, '/ext/node_modules/lodash/lodash.js')).toBe(
      false
    );
  });

  it('should transform a listed package installed in an unlisted package', () => {
    expect(
      isTransformed(
        config,
        '/ext/node_modules/lodash/node_modules/yjs/dist/yjs.cjs'
      )
    ).toBe(true);
  });

  it('should not transform an unlisted package installed in a listed package', () => {
    expect(
      isTransformed(
        config,
        '/ext/node_modules/yjs/node_modules/lodash/lodash.js'
      )
    ).toBe(false);
  });

  it('should transform the JupyterLab packages', () => {
    expect(
      isTransformed(
        config,
        '/ext/node_modules/@jupyterlab/apputils/lib/index.js'
      )
    ).toBe(true);
  });

  it('should transform the packages of the esModules option', () => {
    const extended = jestConfig('/ext', { esModules: ['d3-array'] });
    expect(
      isTransformed(extended, '/ext/node_modules/d3-array/src/index.js')
    ).toBe(true);
  });
});
