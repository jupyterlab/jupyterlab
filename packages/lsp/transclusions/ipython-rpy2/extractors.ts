import { RegExpForeignCodeExtractor } from '../../extractors/regexp';
import { IForeignCodeExtractorsRegistry } from '../../extractors/types';

import { RPY2_MAX_ARGS, extract_r_args, rpy2_args_pattern } from './rpy2';

function create_rpy_code_extractor(strip_leading_space: boolean) {
  function rpy2_code_extractor(match: string, ...args: string[]) {
    let r = extract_r_args(args, -3);
    let code: string;
    if (r.rest == null) {
      code = '';
    } else if (strip_leading_space) {
      code = r.rest.startsWith(' ') ? r.rest.slice(1) : r.rest;
    } else {
      code = r.rest;
    }
    return code;
  }

  return rpy2_code_extractor;
}

let rpy2_code_extractor_non_stripping = create_rpy_code_extractor(false);

function rpy2_args(match: string, ...args: string[]) {
  let r = extract_r_args(args, -3);
  // define dummy input variables using empty data frames
  let inputs = r.inputs.map(i => i + ' <- data.frame();').join(' ');
  let code = rpy2_code_extractor_non_stripping(match, ...args);
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
      foreign_capture_groups: [RPY2_MAX_ARGS * 2 + 1],
      // it is important to not strip any leading spaces
      foreign_replacer: rpy2_code_extractor_non_stripping,
      extract_arguments: rpy2_args,
      is_standalone: false,
      file_extension: 'R'
    }),
    new RegExpForeignCodeExtractor({
      language: 'r',
      // it is very important to not include the space which will be trimmed in the capture group,
      // otherwise the offset will be off by one and the R language server will crash
      pattern:
        '(?:^|\n)%R' + rpy2_args_pattern(RPY2_MAX_ARGS) + '(?: (.*))?(?:\n|$)',
      foreign_capture_groups: [RPY2_MAX_ARGS * 2 + 1],
      foreign_replacer: create_rpy_code_extractor(true),
      extract_arguments: rpy2_args,
      is_standalone: false,
      file_extension: 'R'
    })
  ]
};
