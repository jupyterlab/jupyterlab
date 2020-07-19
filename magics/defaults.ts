import { IOverridesRegistry } from './overrides';
import {
  parse_r_args,
  rpy2_args_pattern,
  RPY2_MAX_ARGS,
  rpy2_reverse_pattern,
  rpy2_reverse_replacement
} from './rpy2';

function escape(x: string) {
  return x.replace(/"/g, '\\"');
}

function unescape(x: string) {
  return x.replace(/\\"/g, '"');
}

function empty_or_escaped(x: string) {
  if (!x) {
    return '';
  } else {
    return escape(x);
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
      // x =%ls is also valid. However, percent may also appear in strings, e.g. ls('%').
      // Hence: (^|\\s|=) for shell commands (!) and line magics (%); see issue #281.
      // This does not solve all issues, for example `list(" %ls")` still leads to:
      // `list(" get_ipython().run_line_magic("ls")", "")`.
      {
        pattern: '(^|\\s|=)!(\\S+)(.*)(\n)?',
        replacement: '$1get_ipython().getoutput("$2$3")$4',
        reverse: {
          pattern: 'get_ipython\\(\\).getoutput\\("(.*?)"\\)(\n)?',
          replacement: '!$1$2'
        }
      },
      {
        // support up to 10 arguments
        pattern: '%R' + rpy2_args_pattern(RPY2_MAX_ARGS) + '(.*)(\n)?',
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
        pattern: '(^|\\s|=)%(\\S+)(.*)(\n)?',
        replacement: (match, prefix, name, args, line_break) => {
          args = empty_or_escaped(args);
          line_break = line_break || '';
          return `${prefix}get_ipython().run_line_magic("${name}", "${args}")${line_break}`;
        },
        reverse: {
          pattern:
            'get_ipython\\(\\).run_line_magic\\("(.*?)", "(.*?)"\\)(\n)?',
          replacement: (match, name, args) => {
            args = unescape(args);
            return `%${name}${args}`;
          }
        }
      }
    ],
    // if a match for expresion in the key is found at the beginning of a cell, the entire cell is replaced with the value
    cell_magics: [
      // rpy2 extension R magic - this should likely go as an example to the user documentation, rather than being a default
      //   only handles simple one input - one output case
      {
        pattern: '^%%R' + rpy2_args_pattern(RPY2_MAX_ARGS) + '(\n)?([\\s\\S]*)',
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
        pattern: '^%%(\\S+)(.*\n)([\\s\\S]*)',
        replacement: (match, name, first_line, content, offset, entire) => {
          first_line = empty_or_escaped(first_line);
          if (first_line) {
            // remove the new line
            first_line = first_line.slice(0, -1);
          }
          content = content.replace(/"""/g, '\\"\\"\\"');
          return `get_ipython().run_cell_magic("${name}", "${first_line}", """${content}""")`;
        },
        reverse: {
          pattern:
            '^get_ipython\\(\\).run_cell_magic\\("(.*?)", "(.*?)", """([\\s\\S]*)"""\\)',
          replacement: (match, name, line, content) => {
            content = content.replace(/\\"\\"\\"/g, '"""');
            line = unescape(line);
            return `%%${name}${line}\n${content}`;
          }
        }
      }
    ]
  }
};
