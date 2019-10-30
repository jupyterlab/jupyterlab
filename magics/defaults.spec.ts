import { expect } from 'chai';
import { language_specific_overrides } from './defaults';
import { CellMagicsMap, LineMagicsMap } from './maps';

let CELL_MAGIC_EXISTS = `%%MAGIC
some text
`;

let NO_CELL_MAGIC = `%MAGIC
some text
%%MAGIC
some text
`;

let LINE_MAGIC_WITH_SPACE = `%MAGIC line = dd`;

describe('Default IPython overrides', () => {
  describe('IPython cell magics', () => {
    let cell_magics_map = new CellMagicsMap(
      language_specific_overrides['python'].cell_magics
    );
    it('overrides cell magics', () => {
      let override = cell_magics_map.override_for(CELL_MAGIC_EXISTS);
      expect(override).to.equal('MAGIC()');
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
      expect(override).to.equal('MAGIC()');
    });
    it('overrides shell commands', () => {
      let override = line_magics_map.override_for('!ls -o');
      expect(override).to.equal('ls()');
    });
  });
});
