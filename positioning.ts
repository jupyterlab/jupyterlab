import * as CodeMirror from 'codemirror';

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
