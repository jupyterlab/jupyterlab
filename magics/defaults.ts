import { IOverridesRegistry } from './overrides';

function empty_or_escaped(x: string) {
  if (!x) {
    return '';
  } else {
    return x.replace('"', '\\"');
  }
}

function parse_r_args(args: string[], content_position: number) {
  let inputs = [];
  let outputs = [];
  for (let i = 0; i < args.length; i = i + 2) {
    let arg = args[i];
    let variable = args[i + 1];
    if (typeof arg === 'undefined') {
      break;
    } else if (arg === 'i') {
      inputs.push(variable);
    } else if (arg === 'o') {
      outputs.push(variable);
    }
  }
  let rest = args.slice(content_position, content_position + 1);
  let input_variables = inputs.join(', ');
  if (input_variables) {
    input_variables = ', ' + input_variables;
  }
  let output_variables = outputs.join(', ');
  if (output_variables) {
    output_variables = output_variables + ' = ';
  }
  return {
    content: rest,
    inputs: input_variables,
    outputs: output_variables
  };
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
          return `${r.outputs}rpy2.ipython.rmagic.RMagics.R("${r.content}"${r.inputs})`;
        },
        reverse: {
          pattern:
            '(\\S+)?' +
            '(?:, (\\S+))?'.repeat(9) +
            '( = )?rpy2\\.ipython\\.rmagic\\.RMagics.R\\("(.*?)"' +
            '(?:, (\\S+))?'.repeat(10) +
            '\\)',
          replacement: (match, ...args) => {
            let outputs = [];
            for (let i = 0; i < 10; i++) {
              if (typeof args[i] === 'undefined') {
                break;
              }
              outputs.push(args[i]);
            }
            let inputs = [];
            for (let i = 12; i < 22; i++) {
              if (typeof args[i] === 'undefined') {
                break;
              }
              inputs.push(args[i]);
            }
            let input_variables = inputs.join(' -i ');
            if (input_variables) {
              input_variables = ' -i ' + input_variables;
            }
            let output_variables = outputs.join(' -o ');
            if (output_variables) {
              output_variables = ' -o ' + output_variables;
            }
            let other_args = args[11];
            return '%R' + input_variables + output_variables + other_args;
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
          return `${r.outputs}rpy2.ipython.rmagic.RMagics.R("""${r.content}""")${r.inputs}`;
        },
        reverse: {
          pattern: 'rpy2\\.ipython\\.rmagic\\.RMagics.R\\("""([\\s\\S]*)"""\\)',
          replacement: '%%R\n$1'
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
