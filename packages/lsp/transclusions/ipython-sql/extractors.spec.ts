import { expect } from 'chai';

import {
  extract_code,
  get_the_only_virtual,
  wrap_in_python_lines
} from '../../extractors/testutils';
import { BrowserConsole } from '../../virtual/console';
import { VirtualDocument } from '../../virtual/document';

import { SQL_URL_PATTERN, foreign_code_extractors } from './extractors';

describe('IPython SQL extractors', () => {
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

  describe('SQL url pattern', () => {
    it('matches connection strings', () => {
      const correct_urls = [
        'mysql+pymysql://scott:tiger@localhost/foo',
        'oracle://scott:tiger@127.0.0.1:1521/sidname',
        'sqlite://',
        'sqlite:///foo.db',
        'mssql+pyodbc://username:password@host/database?driver=SQL+Server+Native+Client+11.0',
        'impala://hserverhost:port/default?kerberos_service_name=hive&auth_mechanism=GSSAPI'
      ];
      const pattern = new RegExp(SQL_URL_PATTERN);
      for (let url of correct_urls) {
        expect(pattern.test(url)).to.equal(true);
      }
    });
  });

  describe('%sql line magic', () => {
    it('extracts simple commands', () => {
      let code = wrap_in_python_lines('%sql select * from work');
      let { cell_code_kept, foreign_document_map } = extract(code);

      // should not be removed, but left for the static analysis (using magic overrides)
      expect(cell_code_kept).to.equal(code);
      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal('select * from work\n');
    });

    it('leaves out the connection specification', () => {
      let code = wrap_in_python_lines(
        '%sql postgresql://will:longliveliz@localhost/shakes'
      );
      let foreign_document_map = extract(code).foreign_document_map;
      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal('\n');
    });

    it('leaves out options', () => {
      let code = wrap_in_python_lines('%sql -l');
      let foreign_document_map = extract(code).foreign_document_map;
      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal('\n');
    });
  });

  describe('%%sql cell magic', () => {
    it('extracts simple commands', () => {
      let code = "%%sql\nselect * from character\nwhere abbrev = 'ALICE'";
      let { cell_code_kept, foreign_document_map } = extract(code);

      expect(cell_code_kept).to.equal(code);
      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal(
        "select * from character\nwhere abbrev = 'ALICE'\n"
      );
    });

    it('leaves out the connection specification', () => {
      let code =
        "%%sql postgresql://will:longliveliz@localhost/shakes\nselect * from character\nwhere abbrev = 'ALICE'";
      let { foreign_document_map } = extract(code);

      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal(
        "select * from character\nwhere abbrev = 'ALICE'\n"
      );
    });

    it('leaves out the variable assignment', () => {
      let code = '%%sql works << SELECT title, year\nFROM work';
      let { foreign_document_map } = extract(code);

      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal('SELECT title, year\nFROM work\n');
    });

    it('leaves out existing connection references', () => {
      let code = '%%sql will@shakes\nSELECT title, year\nFROM work';
      let { foreign_document_map } = extract(code);

      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal('SELECT title, year\nFROM work\n');
    });

    it('leaves out persist option', () => {
      let code = '%%sql --persist dataframe\nSELECT * FROM dataframe;';
      let { foreign_document_map } = extract(code);
      let document = get_the_only_virtual(foreign_document_map);
      expect(document.language).to.equal('sql');
      expect(document.value).to.equal('SELECT * FROM dataframe;\n');
    });
  });
});
