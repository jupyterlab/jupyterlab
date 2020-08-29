import { IForeignCodeExtractorsRegistry } from '../../extractors/types';
import { RegExpForeignCodeExtractor } from '../../extractors/regexp';
import { extract_r_args, rpy2_args_pattern, RPY2_MAX_ARGS } from './rpy2';

function rpy2_code_extractor(match: string, ...args: string[]) {
  let r = extract_r_args(args, -3);
  let code: string;
  if (r.rest == null) {
    code = '';
  } else {
    code = r.rest.startsWith(' ') ? r.rest.slice(1) : r.rest;
  }
  return code;
}

function rpy2_args(match: string, ...args: string[]) {
  let r = extract_r_args(args, -3);
  // define dummy input variables using empty data frames
  let inputs = r.inputs.map(i => i + ' <- data.frame();').join(' ');
  let code = rpy2_code_extractor(match, ...args);
  if (inputs !== '' && code) {
    inputs += ' ';
  }
  return inputs;
}

export let foreign_code_extractors: IForeignCodeExtractorsRegistry = {
  // general note: to match new lines use [^] instead of dot, unless the target is ES2018, then use /s
  python: [
    //
    // R magics (non-standalone: the R code will always be in the same, single R-namespace)
    //
    new RegExpForeignCodeExtractor({
      language: 'r',
      pattern: '^%%R' + rpy2_args_pattern(RPY2_MAX_ARGS) + '\n([^]*)',
      extract_to_foreign: rpy2_code_extractor,
      extract_arguments: rpy2_args,
      is_standalone: false,
      file_extension: 'R'
    }),
    new RegExpForeignCodeExtractor({
      language: 'r',
      pattern: '(?:^|\n)%R' + rpy2_args_pattern(RPY2_MAX_ARGS) + '( .*)?\n?',
      extract_to_foreign: rpy2_code_extractor,
      extract_arguments: rpy2_args,
      is_standalone: false,
      file_extension: 'R'
    })
  ]
};
