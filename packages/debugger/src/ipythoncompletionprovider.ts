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
 * Name of the completion helper function defined in the paused frame.
 */
const HELPER_NAME = '_jupyterlab_debugger_completions';

/**
 * Python definition of the completion helper. Runs IPython's matchers on
 * the namespace of the paused frame (found via the caller frame, since the
 * helper is called by an expression evaluated in that frame) and returns
 * the payload - "tok_len" and "items" as `[text, type]` pairs - as
 * base64-encoded JSON, so that its Python repr (which is what debugpy
 * sends back) contains no escape sequences and can be decoded natively.
 * A single string is returned (rather than a dict) because debugpy may
 * elide container reprs, while string results round-trip whole up to
 * ~64 kB - ample headroom for the completion limit below.
 */
const HELPER_DEFINITION = `
def ${HELPER_NAME}(text, offset):
    import base64
    import inspect
    import json
    from IPython.core.completer import IPCompleter, CompletionContext
    frame = inspect.currentframe().f_back
    completer = IPCompleter(
        namespace=frame.f_locals, global_namespace=frame.f_globals
    )
    completer.line_buffer = text
    completer.text_until_cursor = text
    token = completer.splitter.split_line(text)
    context = CompletionContext(
        token=token,
        full_text=text,
        cursor_position=offset,
        cursor_line=0,
        limit=200,
    )
    matchers = ['dict_key_matcher', 'python_func_kw_matcher', 'file_matcher']
    payload = {
        'tok_len': len(token),
        'items': [
            [c.text, c.type or '']
            for matcher in matchers
            for c in getattr(completer, matcher)(context).get('completions', [])
            if c.text
        ],
    }
    return base64.b64encode(json.dumps(payload).encode()).decode()
`.trim();

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

    try {
      // debugpy execs multi-line repl code and discards the value of the
      // last expression, so the work happens in two requests: define a
      // helper function (definitions persist in the paused frame, like in
      // the debug console), then call it as a single expression whose
      // return value comes back in the reply. Only the helper's name leaks
      // into the frame; its own locals are function-scoped. The stopped
      // frame's namespace is read from the caller frame at call time.
      const setupReply = await session.sendRequest('evaluate', {
        expression: HELPER_DEFINITION,
        frameId,
        context: 'repl'
      });
      if (!setupReply.success) {
        return { start: 0, end: 0, items: [] };
      }

      const reply = await session.sendRequest('evaluate', {
        expression: `${HELPER_NAME}(${textLiteral}, ${offset})`,
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
