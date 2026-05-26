// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { SourceChange } from '@jupyter/ydoc';
import type {
  CompletionTriggerKind,
  ICompletionContext,
  ICompletionProvider
} from '@jupyterlab/completer';
import type { CompletionHandler } from '@jupyterlab/completer';
import type { IDebugger } from '@jupyterlab/debugger';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';

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
   * Trigger completion automatically when one of the adapter's
   * `completionTriggerCharacters` is typed (defaults to `['.']`).
   */
  shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange,
    context?: ICompletionContext
  ): boolean {
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

    const frameId = this._debuggerService.model.callstack.frame?.id;

    try {
      const reply = await session.sendRequest('completions', {
        text: request.text,
        column: request.offset + 1, // DAP uses 1-based columns (columnsStartAt1: true)
        frameId
      });

      if (!reply.success || !reply.body.targets.length) {
        return { start: 0, end: 0, items: [] };
      }

      const targets = reply.body.targets;
      // debugpy returns 0-based start positions (despite columnsStartAt1: true)
      const start = targets[0].start ?? request.offset;
      const end = start + (targets[0].length ?? 0);

      const items: CompletionHandler.ICompletionItem[] = targets.map(item => ({
        label: item.label,
        insertText: item.text ?? item.label,
        documentation: item.detail,
        type: item.type as string | undefined
      }));

      return { start, end, items };
    } catch (error) {
      console.warn('Error fetching debugger completions:', error);
      return { start: 0, end: 0, items: [] };
    }
  }

  private _trans: TranslationBundle;
  private _debuggerService: IDebugger;
}

export namespace DebuggerCompletionProvider {
  export interface IOptions {
    debuggerService: IDebugger;
    translator?: ITranslator;
  }
}
