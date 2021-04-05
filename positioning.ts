import { CodeEditor } from '@jupyterlab/codeeditor';
import type * as CodeMirror from 'codemirror';

/**
 * is_* attributes are there only to enforce strict interface type checking
 */
export interface IPosition extends CodeMirror.Position {}

export function is_equal(self: IPosition, other: IPosition): boolean {
  return other && self.line === other.line && self.ch === other.ch;
}

export interface ISourcePosition extends IPosition {
  is_source: true;
}

export interface IEditorPosition extends IPosition {
  is_editor: true;
}

export interface IVirtualPosition extends IPosition {
  is_virtual: true;
}

export interface IRootPosition extends ISourcePosition {
  is_root: true;
}

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

export function offset_at_position(
  position: CodeEditor.IPosition,
  lines: string[],
  lines_include_breaks = false
): number {
  let break_increment = lines_include_breaks ? 0 : 1;
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    let text_line = lines[i];
    if (position.line > i) {
      offset += text_line.length + break_increment;
    } else {
      offset += position.column;
      break;
    }
  }
  return offset;
}
