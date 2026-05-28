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
 * Completion provider that delegates to IPython's matcher API for completions
 * that DAP's `completions` request does not cover, specifically:
 * - dict_key_matcher: dict/DataFrame/numpy keys, custom _ipython_key_completions_()
 * - python_func_kw_matcher: function keyword arguments
 * - file_matcher: filesystem paths
 *
 * Only applicable when stopped at a Python frame.
 */
export class DebuggerIPythonCompletionProvider implements ICompletionProvider {
  readonly identifier = 'DebuggerIPythonCompletionProvider';
  readonly name: string;
  // Slightly higher rank than DebuggerCompletionProvider (1000) so that
  // shouldShowContinuousHint controls auto-trigger for quote/DAP chars.
  readonly rank = 1001;

  constructor(protected options: DebuggerIPythonCompletionProvider.IOptions) {
    const translator = options.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
    this.name = this._trans.__('Debugger (IPython)');
    this._debuggerService = options.debuggerService;
  }

  async isApplicable(context: ICompletionContext): Promise<boolean> {
    if (!this._debuggerService.model.callstack.frame) {
      return false;
    }
    const info = await this._debuggerService.session?.connection?.kernel?.info;
    return info?.language_info?.name === 'python';
  }

  shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange,
    context?: ICompletionContext
  ): boolean {
    const { sourceChange } = changed;
    if (!sourceChange || sourceChange.some(delta => delta.delete != null)) {
      return false;
    }
    const dapTriggerChars = this._debuggerService.session?.capabilities
      ?.completionTriggerCharacters ?? ['.'];
    // Add quote characters to trigger dict-key completions automatically.
    const triggerChars = new Set([...dapTriggerChars, "'", '"']);
    return sourceChange.some(
      delta => delta.insert != null && triggerChars.has(delta.insert)
    );
  }

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
    const textBeforeCursor = request.text.slice(0, request.offset);
    // JSON.stringify produces a valid Python string literal for all inputs.
    const textLiteral = JSON.stringify(textBeforeCursor);
    const offset = textBeforeCursor.length;

    // Multi-statement Python evaluated in the stopped frame via DAP (exec mode).
    // locals()/globals() are captured first to reflect the current frame's scope.
    // The last expression's value becomes reply.body.result.
    // Returns JSON: {"tok_len": N, "items": [[text, type], ...]}
    const code = `
import json
from IPython.core.completer import IPCompleter, CompletionContext
_ns = locals()
_gs = globals()
_c = IPCompleter(namespace=_ns, global_namespace=_gs)
_c.line_buffer = ${textLiteral}
_c.text_until_cursor = ${textLiteral}
_tok = _c.splitter.split_line(${textLiteral})
_ctx = CompletionContext(
    token=_tok,
    full_text=${textLiteral},
    cursor_position=${offset},
    cursor_line=0,
    limit=200,
)
json.dumps({
    'tok_len': len(_tok),
    'items': [
        [c.text, c.type or '']
        for _m in ['dict_key_matcher', 'python_func_kw_matcher', 'file_matcher']
        for c in getattr(_c, _m)(_ctx).get('completions', [])
        if c.text
    ]
})
`.trim();

    try {
      const reply = await session.sendRequest('evaluate', {
        expression: code,
        frameId,
        context: 'repl'
      });

      if (!reply.success || !reply.body.result) {
        return { start: 0, end: 0, items: [] };
      }

      const data = _parseJsonFromPythonRepr(reply.body.result);
      if (!data || !data.items.length) {
        return { start: 0, end: 0, items: [] };
      }

      const start = request.offset - data.tokLen;
      const end = request.offset;

      const items: CompletionHandler.ICompletionItem[] = data.items.map(
        ([text, type]) => ({
          label: text,
          insertText: text,
          type: type || undefined
        })
      );

      return { start, end, items };
    } catch (error) {
      console.warn('Error fetching IPython debugger completions:', error);
      return { start: 0, end: 0, items: [] };
    }
  }

  private _trans: TranslationBundle;
  private _debuggerService: IDebugger;
}

/**
 * Parse the Python repr of a json.dumps() result.
 * debugpy returns reply.body.result as the Python repr of the evaluated
 * expression, so a JSON string comes back as a single-quoted Python string.
 */
function _parseJsonFromPythonRepr(
  pythonRepr: string
): { tokLen: number; items: Array<[string, string]> } | null {
  const trimmed = pythonRepr.trim();
  let inner: string;
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    inner = _unescapePythonRepr(trimmed.slice(1, -1));
  } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    inner = _unescapePythonRepr(trimmed.slice(1, -1));
  } else {
    return null;
  }
  try {
    const data = JSON.parse(inner);
    if (typeof data?.tok_len !== 'number' || !Array.isArray(data?.items)) {
      return null;
    }
    return {
      tokLen: data.tok_len as number,
      items: (data.items as unknown[]).filter(
        (item): item is [string, string] =>
          Array.isArray(item) && item.length >= 2
      )
    };
  } catch {
    return null;
  }
}

/** Unescape a Python single-pass string repr (content between outer quotes). */
function _unescapePythonRepr(s: string): string {
  return s.replace(/\\([\s\S])/g, (_, c: string) => {
    switch (c) {
      case "'":
        return "'";
      case '"':
        return '"';
      case '\\':
        return '\\';
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      default:
        return c;
    }
  });
}

export namespace DebuggerIPythonCompletionProvider {
  export interface IOptions {
    debuggerService: IDebugger;
    translator?: ITranslator;
  }
}
