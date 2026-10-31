// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { SourceChange } from '@jupyter/ydoc';
import type {
  CompletionTriggerKind,
  ICompletionContext,
  ICompletionProvider
} from '@jupyterlab/completer';
import type { CompletionHandler } from '@jupyterlab/completer';
import {
  isContinuousHintingChange,
  isHintableMimeType
} from '@jupyterlab/completer';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { IDebugger } from './tokens';

/**
 * Completion provider that uses the DAP `completions` request for suggestions.
 * Only applicable when the debugger is stopped at a frame.
 */
export class DebuggerCompletionProvider implements ICompletionProvider {
  readonly identifier = 'DebuggerCompletionProvider';
  readonly name: string;
  readonly rank = 1000;

  constructor(protected options: DebuggerCompletionProvider.IOptions) {
    const translator = options.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
    this.name = this._trans.__('Debugger');
    this._debuggerService = options.debuggerService;
    this._isDebugConsole = options.isDebugConsole ?? (() => false);
  }

  /**
   * Check if this completion provider is applicable to the given context.
   * Only applicable when the debugger is stopped at a frame and the debug
   * adapter supports the DAP completions request.
   */
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return (
      !!this._debuggerService.model.callstack.frame &&
      !!this._debuggerService.session?.capabilities?.supportsCompletionsRequest
    );
  }

  /**
   * In the Debug Console, trigger completion automatically when one of the
   * adapter's `completionTriggerCharacters` is typed (defaults to `['.']`).
   * Elsewhere, such as in a notebook while paused, use the default heuristic
   * of the completer, because only the highest ranked provider is asked.
   */
  shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange,
    context?: ICompletionContext
  ): boolean {
    if (!this._isDebugConsole(context)) {
      return (
        isHintableMimeType(context?.editor?.model.mimeType ?? '') &&
        !completerIsVisible &&
        isContinuousHintingChange(changed)
      );
    }
    // The visible completer already filters its items on typing;
    // triggering another fetch would only cause redundant requests.
    if (completerIsVisible) {
      return false;
    }
    const { sourceChange } = changed;
    if (!sourceChange || sourceChange.some(delta => delta.delete != null)) {
      return false;
    }
    const triggerChars = this._debuggerService.session?.capabilities
      ?.completionTriggerCharacters ?? ['.'];
    return sourceChange.some(
      delta => delta.insert != null && triggerChars.includes(delta.insert)
    );
  }

  /**
   * Fetch completion suggestions using the DAP completions request.
   */
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext,
    trigger?: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    const session = this._debuggerService.session;
    if (!session) {
      return { start: 0, end: 0, items: [] };
    }
    // Inside a string literal (such as a dictionary key or a path) the names
    // from the frame do not apply.
    const tokenType = context.editor?.getTokenAtCursor().type;
    if (tokenType && /string/i.test(tokenType)) {
      return { start: 0, end: 0, items: [] };
    }
    // debugpy, the adapter of Python kernels, completes attributes of dotted
    // names only: for `names[0].a` it returns the variables and builtins
    // which start with `a`. DebuggerIPythonCompletionProvider completes
    // these attributes.
    if (
      isAttributeOfExpression(request.text.slice(0, request.offset)) &&
      (await this._isPython())
    ) {
      return { start: 0, end: 0, items: [] };
    }

    const frameId = this._debuggerService.model.callstack.frame?.id;

    // DAP line/column are 1-based (linesStartAt1/columnsStartAt1: true)
    // and the column is measured within the cursor's line.
    const lines = request.text.slice(0, request.offset).split('\n');
    const lastLine = lines[lines.length - 1];
    // Offset of the first character of the cursor's line in the full text.
    const lineOffset = request.offset - lastLine.length;

    try {
      const reply = await session.sendRequest('completions', {
        text: request.text,
        line: lines.length,
        column: lastLine.length + 1,
        frameId
      });

      const targets = reply.body?.targets;
      if (!reply.success || !targets?.length) {
        return { start: 0, end: 0, items: [] };
      }
      // debugpy returns start positions which are 0-based (despite
      // columnsStartAt1: true) and relative to the cursor's line.
      const start = lineOffset + (targets[0].start ?? lastLine.length);
      const end = start + (targets[0].length ?? 0);

      const items: CompletionHandler.ICompletionItem[] = targets.map(item => ({
        label: item.label,
        insertText: item.text ?? item.label,
        documentation: item.detail,
        // `CompletionItemType` is a union of string literals.
        type: item.type
      }));

      return { start, end, items };
    } catch (error) {
      console.warn('Error fetching debugger completions:', error);
      return { start: 0, end: 0, items: [] };
    }
  }

  /**
   * Whether the kernel of the debug session runs Python.
   */
  private async _isPython(): Promise<boolean> {
    try {
      const info =
        await this._debuggerService.session?.connection?.kernel?.info;
      return info?.language_info?.name === 'python';
    } catch {
      return false;
    }
  }

  private _trans: TranslationBundle;
  private _debuggerService: IDebugger;
  private _isDebugConsole: (context?: ICompletionContext) => boolean;
}

/**
 * Whether the text before the cursor ends with an attribute of an expression
 * which is not a dotted name, as in `names[0].cap`, `get().` or `'abc'.up`.
 * Callers check first that the cursor is not inside a string, where a quote
 * can open the string, as in `open('.git`.
 */
export function isAttributeOfExpression(textBeforeCursor: string): boolean {
  return /[\])}'"](?:\.\w*)+$/.test(textBeforeCursor);
}

export namespace DebuggerCompletionProvider {
  export interface IOptions {
    debuggerService: IDebugger;
    translator?: ITranslator;
    /**
     * Whether the completion context is the Debug Console, where the
     * adapter's trigger characters open the completer. By default, no
     * context is.
     */
    isDebugConsole?: (context?: ICompletionContext) => boolean;
  }
}
