import { expect } from 'chai';

import { extract_code, get_the_only_virtual } from '../../extractors/testutils';
import { BrowserConsole } from '../../virtual/console';
import { VirtualDocument } from '../../virtual/document';

import { foreign_code_extractors } from './extractors';

describe('Bigquery SQL extractors', () => {
  let document: VirtualDocument;

  function extract(code: string) {
    return extract_code(document, code);
  }

  beforeEach(() => {
    document = new VirtualDocument({
      language: 'python',
      path: 'test.ipynb',
      overrides_registry: {},
      foreign_code_extractors: foreign_code_extractors,
      standalone: false,
      file_extension: 'py',
      has_lsp_supported_file: false,
      console: new BrowserConsole()
    });
  });

  afterEach(() => {
    document.clear();
  });

  describe('%%bigquery cell magic', () => {
    it('extracts simple commands', () => {
      let code = "%%bigquery\nselect * from character\nwhere abbrev = 'ALICE'";
      let { cell_code_kept, foreign_document_map } = extract(code);

      expect(cell_code_kept).to.equal(code);
      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal(
        "select * from character\nwhere abbrev = 'ALICE'\n"
      );
    });
  });
});
