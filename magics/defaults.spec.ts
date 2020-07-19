import { expect } from 'chai';
import { language_specific_overrides } from './defaults';
import { CellMagicsMap, LineMagicsMap } from './maps';

const CELL_MAGIC_EXISTS = `%%MAGIC
some text
`;

const CELL_MAGIC_WITH_DOCSTRINGS = `%%MAGIC
text
"""a docstring"""
'''a less common docstring'''
'single quotes'
"double quotes"
text
`;

const ESCAPED_TEXT_WITH_DOCSTRINGS = `text
\\"\\"\\"a docstring\\"\\"\\"
'''a less common docstring'''
'single quotes'
"double quotes"
text
`;

const NO_CELL_MAGIC = `%MAGIC
some text
%%MAGIC
some text
`;

const LINE_MAGIC_WITH_SPACE = `%MAGIC line = dd`;

describe('Default IPython overrides', () => {
  describe('IPython cell magics', () => {
    let cell_magics_map = new CellMagicsMap(
      language_specific_overrides['python'].cell_magics
    );
    it('overrides cell magics', () => {
      let override = cell_magics_map.override_for(CELL_MAGIC_EXISTS);
      expect(override).to.equal(
        'get_ipython().run_cell_magic("MAGIC", "", """some text\n""")'
      );

      let reverse = cell_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(CELL_MAGIC_EXISTS);
    });

    it('works for empty cells', () => {
      // those are not correct syntax, but will happen when users are in the process of writing
      const cell_magic_with_args = '%%MAGIC\n';
      let override = cell_magics_map.override_for(cell_magic_with_args);
      expect(override).to.equal(
        'get_ipython().run_cell_magic("MAGIC", "", """""")'
      );

      let reverse = cell_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(cell_magic_with_args);
    });

    it('escapes arguments in the first line', () => {
      const cell_magic_with_args = '%%MAGIC "arg in quotes"\ntext';
      let override = cell_magics_map.override_for(cell_magic_with_args);
      expect(override).to.equal(
        'get_ipython().run_cell_magic("MAGIC", " \\"arg in quotes\\"", """text""")'
      );

      let reverse = cell_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(cell_magic_with_args);
    });

    it('escapes docstrings properly', () => {
      let override = cell_magics_map.override_for(CELL_MAGIC_WITH_DOCSTRINGS);
      expect(override).to.equal(
        'get_ipython().run_cell_magic("MAGIC", "", """' +
          ESCAPED_TEXT_WITH_DOCSTRINGS +
          '""")'
      );

      let reverse = cell_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(CELL_MAGIC_WITH_DOCSTRINGS);
    });

    it('does not override cell-magic-like constructs', () => {
      let override = cell_magics_map.override_for(NO_CELL_MAGIC);
      expect(override).to.equal(null);

      override = cell_magics_map.override_for(LINE_MAGIC_WITH_SPACE);
      expect(override).to.equal(null);
    });
  });

  describe('IPython line magics', () => {
    let line_magics_map = new LineMagicsMap(
      language_specific_overrides['python'].line_magics
    );
    it('overrides line magics', () => {
      let override = line_magics_map.override_for(LINE_MAGIC_WITH_SPACE);
      expect(override).to.equal(
        'get_ipython().run_line_magic("MAGIC", " line = dd")'
      );

      let reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(LINE_MAGIC_WITH_SPACE);
    });

    it('overrides x =%ls', () => {
      // this is a corner-case as described in
      // https://github.com/krassowski/jupyterlab-lsp/issues/281#issuecomment-645286076
      let override = line_magics_map.override_for('x =%ls');
      expect(override).to.equal('x =get_ipython().run_line_magic("ls", "")');
    });

    it('does not override line-magic-like constructs', () => {
      let override = line_magics_map.override_for('list("%")');
      expect(override).to.equal(null);
    });

    it('escapes arguments', () => {
      const line_magic_with_args = '%MAGIC "arg"';
      let override = line_magics_map.override_for(line_magic_with_args);
      expect(override).to.equal(
        'get_ipython().run_line_magic("MAGIC", " \\"arg\\"")'
      );

      let reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(line_magic_with_args);
    });

    it('overrides shell commands', () => {
      let override = line_magics_map.override_for('!ls -o');
      expect(override).to.equal('get_ipython().getoutput("ls -o")');

      let reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal('!ls -o');
    });

    it('does not override shell-like constructs', () => {
      let override = line_magics_map.override_for('"!ls"');
      expect(override).to.equal(null);
    });
  });
});
