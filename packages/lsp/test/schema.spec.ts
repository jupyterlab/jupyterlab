/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const childProcess = require('child_process');

describe('@jupyterlab/lsp', () => {
  describe('schema.ts', () => {
    it('verify the interfaces defined in `schema.ts` with the schema in jupyter_lsp', () => {
      const value = childProcess.execSync('yarn build:schema check', {});
      try {
        expect(value.toString().includes('true')).toBe(true);
      } catch (reason) {
        throw new Error(
          `'schema.ts' in '@jupyterlab/lsp' is not matching the 'jupyter_lsp' backend schema.
  Please update 'schema.ts' by running \`npm run build:schema\` in '@jupyterlab/lsp' and commit the changes.`
        );
      }
    });
  });
});
