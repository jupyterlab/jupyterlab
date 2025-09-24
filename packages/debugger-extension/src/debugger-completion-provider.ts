// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  CompletionTriggerKind,
  ICompletionContext,
  ICompletionProvider
} from '@jupyterlab/completer';
import type { CompletionHandler } from '@jupyterlab/completer';
import { IDebugger } from '@jupyterlab/debugger';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

/**
 * Interface for the parsed result from debugger completion evaluation.
 */
interface IDebuggerCompletionResult {
  matches: string[];
  types?: string[];
  cursor_start: number;
  cursor_end: number;
  status: string;
}

/**
 * Completion provider that uses debugger evaluation for suggestions.
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
   */
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    try {
      const spec =
        await this._debuggerService.session?.connection?.kernel?.spec;
      return spec?.language === 'python';
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch completion suggestions using debugger evaluation.
   */
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext,
    trigger?: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    let items: CompletionHandler.ICompletionItem[] = [];
    let parsedResult: IDebuggerCompletionResult;

    try {
      const { text, offset } = request;

      const pyCode = `
from IPython.core.completer import provisionalcompleter as _provisionalcompleter
from IPython.core.completer import rectify_completions as _rectify_completions
from IPython.core.completer import IPCompleter
_EXPERIMENTAL_KEY_NAME = "_jupyter_types_experimental"

def getCompletionsForDebugger(code, cursor_pos):
    ip = get_ipython()

    # Access the current debugger frame
    import inspect
    current_frame = inspect.currentframe()

    # Get the frame that called this function (the debugger's target frame)
    caller_frame = current_frame.f_back if current_frame else None

    # Get the debugger's frame variables
    if caller_frame:
        frame_locals = caller_frame.f_locals
        frame_globals = caller_frame.f_globals
    else:
        frame_locals = locals()
        frame_globals = globals()

    local_completer = IPCompleter(shell=ip, namespace=frame_locals, global_namespace=frame_globals, parent=ip)

    with _provisionalcompleter():
        raw_completions = local_completer.completions(code, cursor_pos)
        completions = list(_rectify_completions(code, raw_completions))

        comps = []
        for comp in completions:
            comps.append(
                dict(
                    start=comp.start,
                    end=comp.end,
                    text=comp.text,
                    type=comp.type,
                    signature=comp.signature,
                )
            )

        if completions:
            s = completions[0].start
            e = completions[0].end
            matches = [c.text for c in completions]
            types = [c.type for c in completions]
        else:
            s = cursor_pos
            e = cursor_pos
            matches = []
            types = []

        result = {
            "matches": matches,
            "types": types,
            "cursor_end": e,
            "cursor_start": s,
            "status": "ok",
        }

        return result
`;
      // create method
      await this._debuggerService.evaluate(pyCode);

      const debuggerCompletions = `getCompletionsForDebugger(${JSON.stringify(
        text
      )}, ${offset})`;
      const evalReply =
        await this._debuggerService.evaluate(debuggerCompletions);

      if (!evalReply) {
        return { start: 0, end: 0, items: [] };
      }

      const matches = evalReply.result;

      // Replace single quotes with double quotes in matches string for JSON parsing
      let correctedMatches = matches.replace(/'/g, '"');

      // TODO - Investigate truncation
      // The eval reply from kernel truncates the result string (a string representation
      // of an array containing completion results). Anything after a certain number of
      // matches (19 for ipykernel) is replaced by ellipses, which needs to be removed to parse into JSON.
      correctedMatches = correctedMatches.replace(/, \.\.\./g, '');

      try {
        parsedResult = JSON.parse(correctedMatches);
      } catch (error) {
        console.error('Failed to parse corrected matches:', error);
        return { start: 0, end: 0, items: [] };
      }

      // Parse completions into completion items
      const parsedCompletions: CompletionHandler.ICompletionItem[] =
        parsedResult.matches.map((match: string, index: number) => ({
          label: match,
          insertText: match,
          type: parsedResult.types?.[index] || undefined
        }));

      items = [...parsedCompletions];
    } catch (error) {
      console.warn('Error fetching debugger completions:', error);
      // Return empty items on error
      return { start: 0, end: 0, items: [] };
    }

    // Extract cursor positions from the parsed result if available
    const start = parsedResult.cursor_start ?? 0;
    const end = parsedResult.cursor_end ?? 0;

    return { start, end, items };
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
