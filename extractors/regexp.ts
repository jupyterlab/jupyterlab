import { IExtractedCode, IForeignCodeExtractor } from './types';
import { CodeEditor } from '@jupyterlab/codeeditor';

// TODO: needs heavy unit testing
export function position_at_offset(
  offset: number,
  lines: string[]
): CodeEditor.IPosition {
  let line = 0;
  let column = 0;
  for (let text_line of lines) {
    // each line has a new line symbol which is accounted for in offset!
    if (text_line.length + 1 <= offset) {
      offset -= text_line.length + 1;
      line += 1;
    } else {
      column = offset;
      break;
    }
  }
  return { line, column };
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

    while (match !== null) {
      let matched_string = match[0];
      let foreign_code_fragment = matched_string.replace(
        this.expression,
        this.options.extract_to_foreign
      );

      // NOTE:
      // match.index + matched_string.length === this.sticky_expression.lastIndex

      let end = this.global_expression.lastIndex;

      if (
        this.options.keep_in_host ||
        typeof this.options.keep_in_host === 'undefined'
      ) {
        host_code_fragment = code.substring(started_from, end);
      } else {
        if (started_from === match.index) {
          host_code_fragment = '';
        } else {
          host_code_fragment = code.substring(started_from, match.index) + '\n';
        }
      }

      // TODO: this could be slightly optimized (start at start) by using the match[n],
      //  where n is the group to be used; while this reduces the flexibility of extract_to_foreign,
      //  it might be better to enforce such strict requirement
      let start = match.index + matched_string.indexOf(foreign_code_fragment);

      extracts.push({
        host_code: host_code_fragment,
        foreign_code: foreign_code_fragment,
        range: {
          start: position_at_offset(start, lines),
          end: position_at_offset(start + foreign_code_fragment.length, lines)
        }
      });

      started_from = this.global_expression.lastIndex;
      match = this.global_expression.exec(code);
    }

    if (started_from !== code.length) {
      let final_host_code_fragment = code.substring(started_from, code.length);
      extracts.push({
        host_code: final_host_code_fragment,
        foreign_code: null,
        range: null
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
     *   - %%R( (.*))?\n(.*) will match R cells of rpy2
     *   - (.*)'<html>(.*)</html>'(.*) will match html documents in strings of any language using single ticks
     */
    pattern: string;
    /**
     * String specifying match groups to be extracted from the regular expression match,
     * for the use in virtual document of the foreign language.
     * For the R example this should be '$3'
     */
    extract_to_foreign: string;
    /**
     * String boolean if everything (true, default) or nothing (false) should be kept in the host document.
     *
     * For the R example this should be empty if we wish to ignore the cell,
     * but usually a better option is to retain the foreign code and use language
     * specific overrides to suppress the magic in a more controlled way, providing
     * dummy python code to handle cell input/output.
     *
     * Setting to false is DEPRECATED as it breaks the edit feature (while it could be fixed,
     * it would make the code considerably more complex).
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
