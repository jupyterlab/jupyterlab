import { IOverridesRegistry } from './overrides';

/**
 * Interactive kernels often provide additional functionality invoked by so-called magics,
 * which use distinctive syntax. This features may however not be interpreted correctly by
 * the general purpose language linters. To avoid false-positives making the linter useless
 * for any specific language when magics are used, regular expressions can be used to replace
 * the magics with linter-friendly substitutes; this will be made user configurable.
 */
export const language_specific_overrides: IOverridesRegistry = {
  python: {
    // if a match for expresion in the key is found against a line, the line is replaced with the value
    line_magics: [
      // filter out IPython line magics and shell assignments:
      //  remove the content, keep magic/command name and new line at the end
      { pattern: '^[%!](\\S+)(.*)(\n)?', replacement: '$1()$3' }
    ],
    // if a match for expresion in the key is found at the beginning of a cell, the entire cell is replaced with the value
    cell_magics: [
      // rpy2 extension R magic - this should likely go as an example to the user documentation, rather than being a default
      //   only handles simple one input - one output case
      { pattern: '%%R -i (.+) -o (.+)( .*)?', replacement: '$2 = R($1)' },
      //   handle one input
      { pattern: '%%R -i (.+)( .*)?', replacement: 'R($1)' },
      //   handle one output
      { pattern: '%%R -o (.+)( .*)?', replacement: '$1 = R()' },
      //   handle no input/output arguments
      { pattern: '%%R( .*)?', replacement: 'R()' },
      // skip all other cell magics;
      //   the call (even if invalid) will make linters think that the magic symbol was used in the code,
      //   and silence potential "imported but unused" messages
      { pattern: '%%(.+)( )?(.*)', replacement: '$1()' }
    ]
  }
};
