import { expect } from 'chai';

import { uris_equal } from './utils';

describe('uris_equal', () => {
  it('should workaround Windows paths/Pyright issues', () => {
    const result = uris_equal(
      'file:///d%3A/a/jupyterlab-lsp/jupyterlab-lsp/atest/output/windows_39_4/home/n%C3%B6te%20b%C3%B2%C3%B3ks/example.py',
      'file:///d:/a/jupyterlab-lsp/jupyterlab-lsp/atest/output/windows_39_4/home/n%C3%B6te%20b%C3%B2%C3%B3ks/example.py'
    );
    expect(result).to.equal(true);
  });
});
