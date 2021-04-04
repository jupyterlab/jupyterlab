import { CodeEditor } from '@jupyterlab/codeeditor';

import { replacer } from '../overrides/tokens';
import { position_at_offset } from '../positioning';

import { IExtractedCode, IForeignCodeExtractor } from './types';

export function getIndexOfCaptureGroup(
  expression: RegExp,
  matched_string: string,
  value_of_captured_group: string
): number {
  // TODO: use https://github.com/tc39/proposal-regexp-match-indices once supported in >95% of browsers
  //  (probably around 2025)

  // get index of the part that is being extracted to foreign document
  let captured_groups = expression.exec(matched_string);
  let offset_in_match = 0;

  // first element is full match
  let full_matched = captured_groups[0];

  for (let group of captured_groups.slice(1)) {
    if (typeof group === 'undefined') {
      continue;
    }

    if (group === value_of_captured_group) {
      offset_in_match += full_matched.indexOf(group);
      break;
    }

    let group_end_offset = full_matched.indexOf(group) + group.length;

    full_matched = full_matched.slice(group_end_offset);
    offset_in_match += group_end_offset;
  }

  return offset_in_match;
}

export class RegExpForeignCodeExtractor implements IForeignCodeExtractor {
  options: RegExpForeignCodeExtractor.IOptions;
  language: string;
  global_expression: RegExp;
  test_expression: RegExp;
  expression: RegExp;
  standalone: boolean;
  file_extension: string;

  constructor(options: RegExpForeignCodeExtractor.IOptions) {
    this.language = options.language;
    this.options = options;
    this.global_expression = new RegExp(options.pattern, 'g');
    this.test_expression = new RegExp(options.pattern, 'g');
    this.expression = new RegExp(options.pattern);
    this.standalone = this.options.is_standalone;
    this.file_extension = this.options.file_extension;
  }

  has_foreign_code(code: string): boolean {
    let result = this.test_expression.test(code);
    this.test_expression.lastIndex = 0;
    return result;
  }

  extract_foreign_code(code: string): IExtractedCode[] {
    let lines = code.split('\n');

    let extracts = new Array<IExtractedCode>();

    let started_from = this.global_expression.lastIndex;
    let match: RegExpExecArray = this.global_expression.exec(code);
    let host_code_fragment: string;

    let chosen_replacer: string | replacer;
    let is_new_api_replacer: boolean = false;

    if (typeof this.options.foreign_replacer !== 'undefined') {
      chosen_replacer = this.options.foreign_replacer;
      is_new_api_replacer = true;
    } else if (typeof this.options.foreign_capture_groups !== 'undefined') {
      chosen_replacer = '$' + this.options.foreign_capture_groups.join('$');
      is_new_api_replacer = true;
    } else {
      chosen_replacer = this.options.extract_to_foreign;
    }

    while (match != null) {
      let matched_string = match[0];
      let position_shift: CodeEditor.IPosition = null;

      let foreign_code_fragment = matched_string.replace(
        this.expression,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        chosen_replacer
      );
      let prefix = '';
      if (typeof this.options.extract_arguments !== 'undefined') {
        prefix = matched_string.replace(
          this.expression,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.options.extract_arguments
        );
        position_shift = position_at_offset(prefix.length, prefix.split('\n'));
      }

      // NOTE:
      // match.index + matched_string.length === this.sticky_expression.lastIndex

      let end_index = this.global_expression.lastIndex;

      if (this.options.keep_in_host || this.options.keep_in_host == null) {
        host_code_fragment = code.substring(started_from, end_index);
      } else {
        if (started_from === match.index) {
          host_code_fragment = '';
        } else {
          host_code_fragment = code.substring(started_from, match.index) + '\n';
        }
      }

      let foreign_code_group_value = foreign_code_fragment;

      if (is_new_api_replacer) {
        foreign_code_group_value = matched_string.replace(
          this.expression,
          '$' + Math.min(...this.options.foreign_capture_groups)
        );
      }

      const foreign_group_index_in_match = getIndexOfCaptureGroup(
        this.expression,
        matched_string,
        foreign_code_group_value
      );

      let start_offset = match.index + foreign_group_index_in_match;

      let start = position_at_offset(start_offset, lines);
      let end = position_at_offset(
        start_offset + foreign_code_fragment.length,
        lines
      );

      extracts.push({
        host_code: host_code_fragment,
        foreign_code: prefix + foreign_code_fragment,
        range: { start, end },
        virtual_shift: position_shift
      });

      started_from = this.global_expression.lastIndex;
      match = this.global_expression.exec(code);
    }

    if (started_from !== code.length) {
      let final_host_code_fragment = code.substring(started_from, code.length);
      extracts.push({
        host_code: final_host_code_fragment,
        foreign_code: null,
        range: null,
        virtual_shift: null
      });
    }

    return extracts;
  }
}

namespace RegExpForeignCodeExtractor {
  export interface IOptions {
    /**
     * The foreign language.
     */
    language: string;
    /**
     * String giving regular expression to test cells for the foreign language presence.
     *
     * For example:
     *   - `%%R( (.*))?\n(.*)` will match R cells of rpy2
     *   - `(.*)'<html>(.*)</html>'(.*)` will match html documents in strings of any language using single ticks
     */
    pattern: string;
    /**
     * Array of numbers specifying match groups to be extracted from the regular expression match,
     * for the use in virtual document of the foreign language.
     * For the R example this should be `3`. Please not that these are 1-based, as the 0th index is the full match.
     * If multiple groups are given, those will be concatenated.
     *
     * If additional code is needed in between the groups, use `foreign_replacer` in addition to
     * `foreign_capture_groups` (but not instead!).
     *
     * `foreign_capture_groups` is required for proper offset calculation and will no longer be optional in 4.0.
     */
    foreign_capture_groups?: number[];
    /**
     * Function to compose the foreign document code, in case if using a capture group alone is not sufficient;
     * If specified, `foreign_capture_group` should be specified as well, so that it points to the first occurrence
     * of the foreign code. When both are specified, `foreign_replacer` takes precedence.
     *
     * See:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter
     */
    foreign_replacer?: replacer;
    /**
     * @deprecated `extract_to_foreign` will be removed in 4.0; use `foreign_capture_group` or `foreign_replacer` instead
     */
    extract_to_foreign?: string | replacer;
    /**
     * If arguments from the cell or line magic are to be extracted and prepended before the extracted code,
     * set extract_arguments to a replacer function taking the code and returning the string to be prepended.
     */
    extract_arguments?: replacer;
    /**
     * Boolean if everything (true, default) or nothing (false) should be kept in the host document.
     *
     * For the R example this should be empty if we wish to ignore the cell,
     * but usually a better option is to retain the foreign code and use language
     * specific overrides to suppress the magic in a more controlled way, providing
     * dummy python code to handle cell input/output.
     *
     * Setting to false is DEPRECATED as it breaks the edit feature (while it could be fixed,
     * it would make the code considerably more complex).
     *
     * @deprecated `keep_in_host` will be removed in 4.0
     */
    keep_in_host?: boolean;
    /**
     * Should the foreign code be appended (False) to the previously established virtual document of the same language,
     * or is it standalone snippet which requires separate connection?
     */
    is_standalone: boolean;
    file_extension: string;
  }
}
