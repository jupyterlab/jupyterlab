// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { SourceChange } from '@jupyter/ydoc';
import type {
  CompletionTriggerKind,
  ICompletionContext,
  ICompletionProvider
} from '@jupyterlab/completer';
import type { CompletionHandler } from '@jupyterlab/completer';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { IDebugger } from './tokens';

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

    // Multi-statement Python evaluated in the stopped frame via DAP.
    // debugpy execs multi-line repl code and discards the value of the last
    // expression, so the payload is stored in a frame variable instead and
    // read back with a second, single-expression evaluate request (repl
    // assignments persist in the paused frame, like in the debug console).
    // locals()/globals() are captured first to reflect the frame's scope.
    // The payload {"tok_len": N, "items": [[text, type], ...]} is
    // base64-encoded JSON, so that its Python repr (which is what debugpy
    // sends back) contains no escape sequences and can be decoded natively.
    // A single string is used (rather than returning a dict) because
    // debugpy may elide container reprs, while string results round-trip
    // whole up to ~64 kB - ample headroom for the completion limit below.
    const code = `
import base64
import json
from IPython.core.completer import IPCompleter, CompletionContext
__jlab_ns = locals()
__jlab_gs = globals()
__jlab_c = IPCompleter(namespace=__jlab_ns, global_namespace=__jlab_gs)
__jlab_c.line_buffer = ${textLiteral}
__jlab_c.text_until_cursor = ${textLiteral}
__jlab_tok = __jlab_c.splitter.split_line(${textLiteral})
__jlab_ctx = CompletionContext(
    token=__jlab_tok,
    full_text=${textLiteral},
    cursor_position=${offset},
    cursor_line=0,
    limit=200,
)
__jlab_payload = base64.b64encode(json.dumps({
    'tok_len': len(__jlab_tok),
    'items': [
        [c.text, c.type or '']
        for _m in ['dict_key_matcher', 'python_func_kw_matcher', 'file_matcher']
        for c in getattr(__jlab_c, _m)(__jlab_ctx).get('completions', [])
        if c.text
    ]
}).encode()).decode()
`.trim();

    try {
      const setupReply = await session.sendRequest('evaluate', {
        expression: code,
        frameId,
        context: 'repl'
      });
      if (!setupReply.success) {
        return { start: 0, end: 0, items: [] };
      }

      const reply = await session.sendRequest('evaluate', {
        expression: '__jlab_payload',
        frameId,
        context: 'repl'
      });

      if (!reply.success || !reply.body.result) {
        return { start: 0, end: 0, items: [] };
      }

      const data = _decodePayload(reply.body.result);
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
 * Decode the payload from the evaluate result of the completion code.
 *
 * debugpy returns reply.body.result as the Python repr of the evaluated
 * expression. The expression base64-encodes the JSON payload, so - since
 * base64 text contains no characters that repr escapes - the result is
 * simply the base64 text wrapped in quotes, and the native `atob()` and
 * `JSON.parse()` can do all of the decoding.
 */
function _decodePayload(
  pythonRepr: string
): { tokLen: number; items: Array<[string, string]> } | null {
  const match = pythonRepr.trim().match(/^['"]([a-z0-9+/=]*)['"]$/i);
  if (!match) {
    return null;
  }
  try {
    const data = JSON.parse(atob(match[1]));
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

export namespace DebuggerIPythonCompletionProvider {
  export interface IOptions {
    debuggerService: IDebugger;
    translator?: ITranslator;
  }
}
