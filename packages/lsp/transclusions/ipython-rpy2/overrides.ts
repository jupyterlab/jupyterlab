import { IScopedCodeOverride } from '../../overrides/tokens';
import { LINE_MAGIC_PREFIX } from '../ipython/overrides';

import {
  RPY2_MAX_ARGS,
  parse_r_args,
  rpy2_args_pattern,
  rpy2_reverse_pattern,
  rpy2_reverse_replacement
} from './rpy2';

export let overrides: IScopedCodeOverride[] = [
  {
    // support up to 10 arguments
    pattern:
      LINE_MAGIC_PREFIX +
      '%R' +
      rpy2_args_pattern(RPY2_MAX_ARGS) +
      '( .*)?(\n|$)',
    replacement: (match, prefix, ...args) => {
      let r = parse_r_args(args, -4);
      // note: only supports assignment or -o/--output, not both
      // TODO assignment like in x = %R 1 should be distinguished from -o
      return `${prefix}${r.outputs}rpy2.ipython.rmagic.RMagics.R("${
        r.content || ''
      }", "${r.others}"${r.inputs})`;
    },
    scope: 'line',
    reverse: {
      pattern: rpy2_reverse_pattern(),
      replacement: (match, ...args) => {
        let r = rpy2_reverse_replacement(match, ...args);
        return '%R' + r.input + r.output + r.other + r.contents;
      },
      scope: 'line'
    }
  },
  // rpy2 extension R magic - this should likely go as an example to the user documentation, rather than being a default
  //   only handles simple one input - one output case
  {
    pattern: '^%%R' + rpy2_args_pattern(RPY2_MAX_ARGS) + '(\n)?([\\s\\S]*)',
    replacement: (match, ...args) => {
      let r = parse_r_args(args, -3);
      return `${r.outputs}rpy2.ipython.rmagic.RMagics.R("""${r.content}""", "${r.others}"${r.inputs})`;
    },
    scope: 'cell',
    reverse: {
      pattern: rpy2_reverse_pattern('"""', true),
      replacement: (match, ...args) => {
        let r = rpy2_reverse_replacement(match, ...args);
        return '%%R' + r.input + r.output + r.other + '\n' + r.contents;
      },
      scope: 'cell'
    }
  },
  {
    pattern: LINE_MAGIC_PREFIX + '%Rdevice( .*)?(\n|$)',
    replacement: (match, prefix, ...args) => {
      return `${prefix}rpy2.ipython.rmagic.RMagics.Rdevice("${args[0]}", "")`;
    },
    scope: 'line',
    reverse: {
      pattern: rpy2_reverse_pattern('"', false, 'Rdevice'),
      replacement: (match, ...args) => {
        let r = rpy2_reverse_replacement(match, ...args);
        return '%Rdevice' + r.input + r.output + r.other + r.contents;
      },
      scope: 'line'
    }
  }
];
