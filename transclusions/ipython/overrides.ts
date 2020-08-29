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

export let overrides: IScopedCodeOverride[] = [
  /**
   * Line magics
   */
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
    scope: 'line',
    reverse: {
      pattern: 'get_ipython\\(\\).getoutput\\("(.*?)"\\)(\n)?',
      replacement: '!$1$2',
      scope: 'line'
    }
  },
  {
    pattern: '(^|\\s|=)%(\\S+)(.*)(\n)?',
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
