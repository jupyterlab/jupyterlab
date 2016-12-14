// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  MonacoCodeEditor
} from './editor';

import {
  ansi_to_text, escape_for_html
} from 'ansi_up';

/**
 * The kernel provider.
 */
export
type KernelProvider = () => Kernel.IKernel | null | undefined;

/**
 * Install a kernel based Monaco providers.
 */
export
function attachKernelSupport(editor: MonacoCodeEditor, kernelProvider: KernelProvider): void {
  doAttachKernelSupport(editor, kernelProvider);
  editor.model.mimeTypeChanged.connect(() => doAttachKernelSupport(editor, kernelProvider));
}

/**
 * Install a kernel based Monaco providers.
 */
function doAttachKernelSupport(editor: MonacoCodeEditor, kernelProvider: KernelProvider): void {
  const disposables: monaco.IDisposable[] = [];
  const languageId = editor.editor.getModel().getModeId();
  disposables.push(monaco.languages.registerCompletionItemProvider(languageId, new KernelCompletionProvider(editor, kernelProvider)));
  disposables.push(monaco.languages.registerHoverProvider(languageId, new KernelHoverProvider(editor, kernelProvider)));
  const dispose = () => {
    while (disposables.length !== 0) {
      disposables.pop() !.dispose();
    }
  };
  editor.editor.onDidDispose(dispose);
  editor.model.mimeTypeChanged.connect(dispose);
}

/**
 * The kernel based hover provider.
 */
class KernelHoverProvider implements monaco.languages.HoverProvider {

  /**
   * Create a new instance.
   */
  constructor(editor: MonacoCodeEditor, kernelProvider: KernelProvider) {
    this._editor = editor;
    this._kernelProvider = kernelProvider;
  }

  /**
   * Provide a hover for the given position and document. Multiple hovers at the same
   * position will be merged by the editor. A hover can have a range which defaults
   * to the word range at the position when omitted.
   */
  provideHover(model: monaco.editor.IReadOnlyModel, position: monaco.Position, token: monaco.CancellationToken): monaco.languages.Hover | monaco.Thenable<monaco.languages.Hover> {
    if (model.uri.toString() !== this._editor.editor.getModel().uri.toString()) {
      return null;
    }
    const kernel = this._kernelProvider();
    if (!kernel) {
      return null;
    }
    if (kernel.status !== 'idle') {
      return null;
    }
    return kernel.requestInspect({
      code: model.getValue(),
      cursor_pos: model.getOffsetAt(position),
      detail_level: 0,
    }).then((result) => {
      if (result.content.found) {
        if (result.content.data['text/plain']) {
          let str = result.content.data['text/plain'] as string;
          str = escape_for_html(str);
          str = ansi_to_text(str);
          return {
            contents: [
              str
            ],
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            }
          } as monaco.languages.Hover;
        }
      }
      return null;
    });
  }

  private _editor: MonacoCodeEditor;
  private _kernelProvider: KernelProvider;
}

/**
 * The kernel based completion provider.
 */
class KernelCompletionProvider implements monaco.languages.CompletionItemProvider {

  /**
   * The character set to trigger this completion provider.
   */
  triggerCharacters?: string[] = ['*'];

  /**
   * Create a new instance.
   */
  constructor(editor: MonacoCodeEditor, kernelProvider: KernelProvider) {
    this._editor = editor;
    this._kernelProvider = kernelProvider;
  }

  /**
   * Provide completion items for the given position and document.
   */
  provideCompletionItems(model: monaco.editor.IReadOnlyModel, position: monaco.Position, token: monaco.CancellationToken): monaco.languages.CompletionItem[] | monaco.Thenable<monaco.languages.CompletionItem[]> | monaco.languages.CompletionList | monaco.Thenable<monaco.languages.CompletionList> {
    if (model.uri.toString() !== this._editor.editor.getModel().uri.toString()) {
      return [];
    }
    const kernel = this._kernelProvider();
    if (!kernel) {
      return [];
    }
    if (kernel.status !== 'idle') {
      return [];
    }
    return kernel.requestComplete({
      code: model.getValue(),
      cursor_pos: model.getOffsetAt(position)
    }).then(result => {
      if (result.content.matches.length === 0) {
        return [];
      }
      const startPos = model.getPositionAt(result.content.cursor_start);
      const endPos = model.getPositionAt(result.content.cursor_end);
      return {
        items: result.content.matches.map((element) => {
          return {
            label: element,
            kind: monaco.languages.CompletionItemKind.Variable,
            textEdit: {
              range: {
                startLineNumber: startPos.lineNumber,
                startColumn: startPos.column,
                endLineNumber: endPos.lineNumber,
                endColumn: endPos.column
              },
              text: element
            }
          };
        }),
      };
    });
  }

  /**
   * Given a completion item fill in more data, like [doc-comment](#CompletionItem.documentation)
   * or [details](#CompletionItem.detail).
   *
   * The editor will only resolve a completion item once.
   */
  resolveCompletionItem?(item: monaco.languages.CompletionItem, token: monaco.CancellationToken): monaco.languages.CompletionItem | monaco.Thenable<monaco.languages.CompletionItem> {
    const kernel = this._kernelProvider();
    if (!kernel) {
      return item;
    }
    if (kernel.status !== 'idle') {
      return item;
    }
    return kernel.requestInspect({
      code: item.label,
      cursor_pos: 1,
      detail_level: 0,
    }).then(result => {
      if (result.content.found) {
        if (result.content.data['text/plain']) {
          let str = result.content.data['text/plain'] as string;
          str = ansi_to_text(str);
          item.documentation = str;
        }
      }
      return item;
    });
  }

  private _editor: MonacoCodeEditor;
  private _kernelProvider: KernelProvider;
}
