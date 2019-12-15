import { IOverridesRegistry } from './overrides';
import {
  parse_r_args,
  rpy2_reverse_pattern,
  rpy2_reverse_replacement
} from './rpy2';

function empty_or_escaped(x: string) {
  if (!x) {
    return '';
  } else {
    return x.replace('"', '\\"');
  }
}

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
      //  keep the content, keep magic/command name and new line at the end

      // note magics do not have to start with the new line, for example x = !ls or x = %ls are both valid.
      {
        pattern: '!(\\S+)(.*)(\n)?',
        replacement: 'get_ipython().getoutput("$1$2")$3',
        reverse: {
          pattern: 'get_ipython\\(\\).getoutput\\("(.*?)"\\)(\n)?',
          replacement: '!$1$2'
        }
      },
      {
        // support up to 10 arguments
        pattern: '%R' + '(?: -(\\S+) (\\S+))?'.repeat(10) + '(.*)(\n)?',
        replacement: (match, ...args) => {
          let r = parse_r_args(args, -4);
          return `${r.outputs}rpy2.ipython.rmagic.RMagics.R("${r.content}", "${r.others}"${r.inputs})`;
        },
        reverse: {
          pattern: rpy2_reverse_pattern(),
          replacement: (match, ...args) => {
            let r = rpy2_reverse_replacement(match, ...args);
            return '%R' + r.input + r.output + r.other + r.contents;
          }
        }
      },
      {
        pattern: '%(\\S+)(.*)(\n)?',
        replacement: 'get_ipython().run_line_magic("$1", "$2")$3',
        reverse: {
          pattern:
            'get_ipython\\(\\).run_line_magic\\("(.*?)", "(.*?)"\\)(\n)?',
          replacement: '%$1$2'
        }
      }
    ],
    // if a match for expresion in the key is found at the beginning of a cell, the entire cell is replaced with the value
    cell_magics: [
      // rpy2 extension R magic - this should likely go as an example to the user documentation, rather than being a default
      //   only handles simple one input - one output case
      {
        pattern: '^%%R' + '(?: -(\\S) (\\S+))?'.repeat(10) + '(\n)?([\\s\\S]*)',
        replacement: (match, ...args) => {
          let r = parse_r_args(args, -3);
          return `${r.outputs}rpy2.ipython.rmagic.RMagics.R("""${r.content}""", "${r.others}"${r.inputs})`;
        },
        reverse: {
          pattern: rpy2_reverse_pattern('"""', true),
          replacement: (match, ...args) => {
            let r = rpy2_reverse_replacement(match, ...args);
            return '%%R' + r.input + r.output + r.other + '\n' + r.contents;
          }
        }
      },
      {
        pattern: '^%%(.+)?(.*)(\n)?([\\s\\S]*)',
        replacement: (match, p1, p2, p3, p4, offset, entire) => {
          let cell_magic_name = p1.replace('"', '\\"');
          let first_line = empty_or_escaped(p2);
          let content = p4.replace('""""', '\\"\\"\\"');
          return `get_ipython().run_cell_magic("${cell_magic_name}", "${first_line}", """${content}""")`;
        },
        reverse: {
          // TODO un-escape content - but a low priority, as cell magics are unlikely to need reverse escape...
          //  unless the argument handling would be implemented (but this would be in an R cell magic.
          pattern:
            '^get_ipython\\(\\).run_cell_magic\\("(.*?)", "(.*?)", """([\\s\\S]*)"""\\)',
          replacement: '%%$1$2\n$3'
        }
      }
    ]
  }
};
