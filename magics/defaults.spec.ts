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
      expect(override).to.equal(
        'get_ipython().run_cell_magic("MAGIC", "", """some text\n""")'
      );

      let reverse = cell_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(CELL_MAGIC_EXISTS);
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
    it('overrides shell commands', () => {
      let override = line_magics_map.override_for('!ls -o');
      expect(override).to.equal('get_ipython().getoutput("ls -o")');

      let reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal('!ls -o');
    });
  });
});

let R_CELL_MAGIC = `%%R
print(1)
`;

describe('rpy2 IPython overrides', () => {
  describe('rpy2 cell magics', () => {
    let cell_magics_map = new CellMagicsMap(
      language_specific_overrides['python'].cell_magics
    );
    it('overrides cell magic', () => {
      let override = cell_magics_map.override_for(R_CELL_MAGIC);
      expect(override).to.equal(
        'rpy2.ipython.rmagic.RMagics.R("""print(1)\n""", "")'
      );

      let reverse = cell_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(R_CELL_MAGIC);
    });
  });

  describe('rpy2 line magics', () => {
    let line_magics_map = new LineMagicsMap(
      language_specific_overrides['python'].line_magics
    );
    it('inputs and outputs', () => {
      let line = '%R -i x';
      let override = line_magics_map.override_for(line);
      expect(override).to.equal('rpy2.ipython.rmagic.RMagics.R("", "", x)');
      let reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(line);

      line = '%R -o x';
      override = line_magics_map.override_for(line);
      expect(override).to.equal('x = rpy2.ipython.rmagic.RMagics.R("", "")');
      reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(line);

      line = '%R -i x command()';
      override = line_magics_map.override_for(line);
      expect(override).to.equal(
        'rpy2.ipython.rmagic.RMagics.R(" command()", "", x)'
      );
      reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(line);

      line = '%R -i x -w 800 -h 400 command()';
      override = line_magics_map.override_for(line);
      expect(override).to.equal(
        'rpy2.ipython.rmagic.RMagics.R(" command()", "-w 800 -h 400", x)'
      );
      reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(line);

      line = '%R -i x -o y -i z command()';
      override = line_magics_map.override_for(line);
      expect(override).to.equal(
        'y = rpy2.ipython.rmagic.RMagics.R(" command()", "", x, z)'
      );

      line = '%R -i x -i z -o y -o w command()';
      override = line_magics_map.override_for(line);
      expect(override).to.equal(
        'y, w = rpy2.ipython.rmagic.RMagics.R(" command()", "", x, z)'
      );
      reverse = line_magics_map.reverse.override_for(override);
      expect(reverse).to.equal(line);
    });
  });
});
