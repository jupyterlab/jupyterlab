import { IScopedCodeOverride } from '../../overrides/tokens';

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
 * Line magics do not have to start with the new line, for example:
 *    x = !ls
 *    x = %ls
 *    x =%ls
 * are all valid.
 *
 * The percent may also appear in strings, e.g. ls('%').
 *
 * IPython allows magics on start of a line or in assignments (but only there!), thus:
 *    x = (!ls)
 * is invalid syntax!
 *
 * Therefore we can require that the match starts with either:
 * - zero or more whitespaces right after the beginning of a line, or
 * - variable then equals (with optional whitespaces)
 *
 * This will not always work: e.g.:
 *    x['a = !ls'] = !ls
 * is perfectly valid IPython, but regular expressions cannot help here.
 */
export const LINE_MAGIC_PREFIX = '^(\\s*|\\s*\\S+\\s*=\\s*)'

export let overrides: IScopedCodeOverride[] = [
  /**
   * Line magics
   */
  // filter out IPython line magics and shell assignments:
  //  keep the content, keep magic/command name and new line at the end
  {
    pattern: LINE_MAGIC_PREFIX + '!([^=\\s]+)(.*)(\n)?',
    replacement: '$1get_ipython().getoutput("$2$3")$4',
    scope: 'line',
    reverse: {
      pattern: 'get_ipython\\(\\).getoutput\\("(.*?)"\\)(\n)?',
      replacement: '!$1$2',
      scope: 'line'
    }
  },
  {
    pattern: LINE_MAGIC_PREFIX + '%(\\S+)(.*)(\n)?',
    replacement: (match, prefix, name, args, line_break) => {
      args = empty_or_escaped(args);
      line_break = line_break || '';
      return `${prefix}get_ipython().run_line_magic("${name}", "${args}")${line_break}`;
    },
    scope: 'line',
    reverse: {
      pattern: 'get_ipython\\(\\).run_line_magic\\("(.*?)", "(.*?)"\\)(\n)?',
      replacement: (match, name, args) => {
        args = unescape(args);
        return `%${name}${args}`;
      },
      scope: 'line'
    }
  },
  /**
   * Cell magics
   */
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
    scope: 'cell',
    reverse: {
      pattern:
        '^get_ipython\\(\\).run_cell_magic\\("(.*?)", "(.*?)", """([\\s\\S]*)"""\\)',
      replacement: (match, name, line, content) => {
        content = content.replace(/\\"\\"\\"/g, '"""');
        line = unescape(line);
        return `%%${name}${line}\n${content}`;
      },
      scope: 'cell'
    }
  }
];
