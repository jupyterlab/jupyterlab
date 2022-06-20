const childProcess = require('child_process');

describe('@jupyterlab/lsp', () => {
  describe('schema.ts', () => {
    it('verify the interfaces defined in `schema.ts` with the schema in jupyter_lsp', () => {
      const value = childProcess.execSync('yarn build:schema check', {});
      expect(value.toString().includes('true')).toBe(true);
    });
  });
});
