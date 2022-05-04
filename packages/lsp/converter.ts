import { CodeEditor } from '@jupyterlab/codeeditor';
import type * as CodeMirror from 'codemirror';
import type * as lsProtocol from 'vscode-languageserver-protocol';

export class PositionConverter {
  static lsp_to_cm(position: lsProtocol.Position): CodeMirror.Position {
    return { line: position.line, ch: position.character };
  }

  static cm_to_lsp(position: CodeMirror.Position): lsProtocol.Position {
    return { line: position.line, character: position.ch };
  }

  static lsp_to_ce(position: lsProtocol.Position): CodeEditor.IPosition {
    return { line: position.line, column: position.character };
  }

  static cm_to_ce(position: CodeMirror.Position): CodeEditor.IPosition {
    return { line: position.line, column: position.ch };
  }

  static ce_to_cm(position: CodeEditor.IPosition): CodeMirror.Position {
    return { line: position.line, ch: position.column };
  }
}
