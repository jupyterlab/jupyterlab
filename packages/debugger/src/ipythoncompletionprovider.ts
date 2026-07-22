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
 * Name of the completion helper function; only ever defined in a scratch
 * namespace, never in the paused frame.
 */
const HELPER_NAME = 'completions_for';

/**
 * Python definition of the completion helper. Runs IPython's matchers on
 * the namespace of the paused frame (received as arguments) and returns
 * the payload - "tok_len" and "items" as `[text, type]` pairs - as
 * base64-encoded JSON, so that its Python repr (which is what debugpy
 * sends back) contains no escape sequences and can be decoded natively.
 * A single string is returned (rather than a dict) because debugpy may
 * elide container reprs, while string results round-trip whole up to
 * ~64 kB - ample headroom for the completion limit below.
 */
const HELPER_DEFINITION = `
def ${HELPER_NAME}(text, offset, frame_locals, frame_globals):
    import base64
    import json
    from IPython.core.completer import IPCompleter, CompletionContext
    completer = IPCompleter(
        namespace=frame_locals, global_namespace=frame_globals
    )
    completer.line_buffer = text
    completer.text_until_cursor = text
    token = completer.splitter.split_line(text)
    # cursor_position is measured within the cursor's line
    lines = text[:offset].split('\\n')
    context = CompletionContext(
        token=token,
        full_text=text,
        cursor_position=len(lines[-1]),
        cursor_line=len(lines) - 1,
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
    try {
      const info =
        await this._debuggerService.session?.connection?.kernel?.info;
      return info?.language_info?.name === 'python';
    } catch {
      // A rejection here (e.g. the kernel connection closing) would
      // otherwise reject the reconciliator's Promise.all and disable
      // completions from all providers.
      return false;
    }
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

    // A single self-contained expression: the helper is exec'd into a
    // scratch namespace and called immediately, so its return value comes
    // back in this reply (debugpy only returns values for expressions, not
    // for multi-line code, which it execs) and nothing is ever defined in
    // the paused frame - the variables panel and completions stay clean.
    // The frame's namespace is captured by the lambda defaults, which are
    // evaluated in the frame; JSON.stringify makes the helper definition a
    // valid single-line Python string literal.
    const expression =
      `(lambda ns={}, frame_locals=locals(), frame_globals=globals(): ` +
      `(exec(${JSON.stringify(HELPER_DEFINITION)}, ns), ` +
      `ns[${JSON.stringify(HELPER_NAME)}](` +
      `${textLiteral}, ${offset}, frame_locals, frame_globals))[1])()`;

    try {
      const reply = await session.sendRequest('evaluate', {
        expression,
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

      const start = Math.max(0, request.offset - data.tokLen);
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
    const tokLen: unknown = data?.tok_len;
    if (
      typeof tokLen !== 'number' ||
      !Number.isInteger(tokLen) ||
      tokLen < 0 ||
      !Array.isArray(data?.items)
    ) {
      return null;
    }
    return {
      tokLen,
      items: (data.items as unknown[]).filter(
        (item): item is [string, string] =>
          Array.isArray(item) &&
          item.length >= 2 &&
          typeof item[0] === 'string' &&
          typeof item[1] === 'string'
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
