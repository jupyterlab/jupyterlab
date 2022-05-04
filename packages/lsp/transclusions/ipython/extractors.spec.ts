import { expect } from 'chai';

import { extract_code, get_the_only_virtual } from '../../extractors/testutils';
import { BrowserConsole } from '../../virtual/console';
import { VirtualDocument } from '../../virtual/document';

import { foreign_code_extractors } from './extractors';

describe('IPython extractors', () => {
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

  describe('handles %%python cell magic', () => {
    it('extracts simple commands', () => {
      let code = '%%python\nsys.exit()';
      let { cell_code_kept, foreign_document_map } = extract(code);

      expect(cell_code_kept).to.equal(code);
      let python_document = get_the_only_virtual(foreign_document_map);
      expect(python_document.language).to.equal('python');
      expect(python_document.value).to.equal('sys.exit()\n');
    });
  });

  describe('handles %%html cell magic', () => {
    it('works with html in normal mode', () => {
      let code = '%%html\n<div>safe</div>';
      let { foreign_document_map } = extract(code);

      let html_document = get_the_only_virtual(foreign_document_map);
      expect(html_document.language).to.equal('html');
      expect(html_document.value).to.equal('<div>safe</div>\n');
    });

    it('works with html in isolated mode', () => {
      let code = '%%html --isolated\n<div>dangerous</div>';
      let { foreign_document_map } = extract(code);

      let html_document = get_the_only_virtual(foreign_document_map);
      expect(html_document.language).to.equal('html');
      expect(html_document.value).to.equal('<div>dangerous</div>\n');
    });
  });
});
