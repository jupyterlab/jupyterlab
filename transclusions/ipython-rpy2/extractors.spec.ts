import { VirtualDocument } from '../../virtual/document';
import { expect } from 'chai';
import { foreign_code_extractors } from './extractors';
import {
  extract_code,
  get_the_only_pair,
  get_the_only_virtual,
  wrap_in_python_lines
} from '../../extractors/testutils';

describe('IPython rpy2 extractors', () => {
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
      has_lsp_supported_file: false
    });
  });

  afterEach(() => {
    document.clear();
  });

  describe('%R line magic', () => {
    it('extracts simple commands', () => {
      let code = wrap_in_python_lines('%R ggplot()');
      let { cell_code_kept, foreign_document_map } = extract(code);

      // should not be removed, but left for the static analysis (using magic overrides)
      expect(cell_code_kept).to.equal(code);
      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('ggplot()\n');
    });

    it('parses input (into a dummy data frame)', () => {
      let code = wrap_in_python_lines('%R -i df ggplot(df)');
      let { foreign_document_map } = extract(code);

      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('df <- data.frame(); ggplot(df)\n');
    });

    it('parses input when no code is given', () => {
      let code = '%R -i df';
      let { foreign_document_map } = extract(code);

      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.value).to.equal('df <- data.frame();\n');
    });

    it('parses multiple inputs (into dummy data frames)', () => {
      let code = wrap_in_python_lines('%R -i df -i x ggplot(df)');
      let { virtual_document: r_document } = get_the_only_pair(
        extract(code).foreign_document_map
      );
      expect(r_document.value).to.equal(
        'df <- data.frame(); x <- data.frame(); ggplot(df)\n'
      );
    });

    it('parses inputs ignoring other arguments', () => {
      let code = wrap_in_python_lines('%R -i df --width 300 -o x ggplot(df)');
      let r_document = get_the_only_virtual(extract(code).foreign_document_map);
      expect(r_document.value).to.equal('df <- data.frame(); ggplot(df)\n');
    });
  });

  describe('%%R cell magic', () => {
    it('extracts simple commands', () => {
      let code = '%%R\nggplot()';
      let { cell_code_kept, foreign_document_map } = extract(code);

      expect(cell_code_kept).to.equal(code);
      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('ggplot()\n');
    });
  });

  it('parses input (into a dummy data frame)', () => {
    let code = '%%R -i df\nggplot(df)';
    let { foreign_document_map } = extract(code);

    let r_document = get_the_only_virtual(foreign_document_map);
    expect(r_document.language).to.equal('r');
    expect(r_document.value).to.equal('df <- data.frame(); ggplot(df)\n');
  });
});
