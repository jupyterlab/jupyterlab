import { CodeEditor } from '@jupyterlab/codeeditor';
import type * as CodeMirror from 'codemirror';
import type * as lsp from 'vscode-languageserver-protocol';

/**
 * is_* attributes are there only to enforce strict interface type checking
 */
export interface IPosition extends CodeMirror.Position {}

export function isEqual(self: IPosition, other: IPosition): boolean {
  return other && self.line === other.line && self.ch === other.ch;
}

export interface ISourcePosition extends IPosition {
  isSource: true;
}

export interface IEditorPosition extends IPosition {
  isEditor: true;
}

export interface IVirtualPosition extends IPosition {
  isVirtual: true;
}

export interface IRootPosition extends ISourcePosition {
  isRoot: true;
}

export function positionAtOffset(
  offset: number,
  lines: string[]
): CodeEditor.IPosition {
  let line = 0;
  let column = 0;
  for (let textLine of lines) {
    // each line has a new line symbol which is accounted for in offset!
    if (textLine.length + 1 <= offset) {
      offset -= textLine.length + 1;
      line += 1;
    } else {
      column = offset;
      break;
    }
  }
  return { line, column };
}

export function offsetAtPosition(
  position: CodeEditor.IPosition,
  lines: string[],
  linesIncludeBreaks = false
): number {
  let breakIncrement = linesIncludeBreaks ? 0 : 1;
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    let textLine = lines[i];
    if (position.line > i) {
      offset += textLine.length + breakIncrement;
    } else {
      offset += position.column;
      break;
    }
  }
  return offset;
}

export class PositionError extends Error {
  // no-op
}

export namespace ProtocolCoordinates {
  export function isWithinRange(
    position: lsp.Position,
    range: lsp.Range
  ): boolean {
    const { line, character } = position;
    return (
      line >= range.start.line &&
      line <= range.end.line &&
      // need to be non-overlapping see https://github.com/jupyter-lsp/jupyterlab-lsp/issues/628
      (line != range.start.line || character > range.start.character) &&
      (line != range.end.line || character <= range.end.character)
    );
  }
}
