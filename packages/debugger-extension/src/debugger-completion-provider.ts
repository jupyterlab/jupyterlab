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
 * Type for completion items.
 */
// interface ICompletionItem {
//   label: string;
//   insertText?: string;
//   type?: string;
//   filterText?: string;
// }

/**
 * Completion provider that uses debugger evaluation for suggestions.
 */
export class DebuggerCompletionProvider implements ICompletionProvider {
  readonly identifier = 'DebuggerCompletionProvider';
  readonly name: string;
  readonly rank = 1000; // Higher rank to prioritize debugger completions

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
    // Only provide completions when debugger has stopped threads
    return this._debuggerService.hasStoppedThreads();
  }

  /**
   * Extract the prefix from the current cursor position in the request.
   */
  private extractPrefix(request: CompletionHandler.IRequest): string {
    const text = request.text;
    const offset = request.offset;

    // Extract the current line and prefix
    const lines = text.split('\n');
    let currentLine = 0;
    let currentColumn = 0;

    // Find current line and column from offset
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (charCount + lineLength > offset) {
        currentLine = i;
        currentColumn = offset - charCount;
        break;
      }
      charCount += lineLength;
    }

    const currentLineText = lines[currentLine] || '';
    return currentLineText.slice(0, currentColumn);
  }

  /**
   * Get variable-based completions from debugger variables.
   */
  private getVariableCompletions(prefix: string): any[] {
    // Access current debugger variables
    const debuggerModel = this._debuggerService.model;
    const variables = debuggerModel.variables.scopes;

    // Extract variable names from all scopes
    const variableNames: string[] = [];
    variables.forEach(scope => {
      scope.variables.forEach(variable => {
        // Exclude special variables and function variables
        if (
          variable.name !== 'special variables' &&
          variable.name !== 'function variables'
        ) {
          variableNames.push(variable.name);
        }
      });
    });

    // Filter variables that match the prefix and extract suffix
    const variableCompletions: CompletionHandler.ICompletionItem[] = [];
    variableNames.forEach(name => {
      if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
        const suffix = name.slice(prefix.length);
        if (suffix.length > 0) {
          variableCompletions.push({
            label: name,
            insertText: suffix
            // filterText: name
          });
        }
      }
    });

    return variableCompletions;
  }

  /**
   * Fetch completion suggestions using debugger evaluation.
   */
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext,
    trigger?: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    // Check if debugger has stopped threads (required for evaluation)
    if (!this._debuggerService.hasStoppedThreads()) {
      return { start: 0, end: 0, items: [] };
    }

    let items: CompletionHandler.ICompletionItem[] = [];
    let parsedResult;

    try {
      const prefix = this.extractPrefix(request);
      const text = request.text;
      const offset = request.offset;
      console.log('text', text);
      console.log('offset', offset);

      // Skip if prefix is empty or just whitespace
      if (!prefix.trim()) {
        return { start: 0, end: 0, items: [] };
      }

      // Get variable-based completions
      const variableCompletions = this.getVariableCompletions(prefix);

      const pyCode = `
from IPython.core.completer import provisionalcompleter as _provisionalcompleter
from IPython.core.completer import rectify_completions as _rectify_completions
from IPython.core.completer import IPCompleter
_EXPERIMENTAL_KEY_NAME = "_jupyter_types_experimental"

def funcToEval(code, cursor_pos):
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



        try:
          with open("/tmp/ipykernel_debug.log", "a") as f:
            f.write("=== FRAME DEBUG INFO ===\\n")
            f.write("code: " + repr(code) + ", cursor_pos: " + repr(cursor_pos) + "\\n")
            f.write("current_frame: " + repr(current_frame) + "\\n")
            f.write("caller_frame: " + repr(caller_frame) + "\\n")
            f.write("frame_locals keys: " + repr(list(frame_locals.keys())) + "\\n")
            f.write("frame_globals keys: " + repr(list(frame_globals.keys())) + "\\n")
            f.write("========================\\n")
        except Exception as e:
          with open("/tmp/ipykernel_debug.log", "a") as f:
            f.write("Frame debug error: " + repr(e) + "\\n")
          pass

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
        else:
            s = cursor_pos
            e = cursor_pos
            matches = []

        result = {
            "matches": matches,
            "cursor_end": e,
            "cursor_start": s,
            "status": "ok",
        }

        try:
          with open("/tmp/ipykernel_debug.log", "a") as f:
            f.write("result: " + repr(result) + "\\n")
        except Exception as e:
          pass

        return result

`;

      const t = await this._debuggerService.evaluate(pyCode);
      console.log('ttttttttttffffffttttttzzzzzzzz', t);

      const evalCode = `funcToEval(${JSON.stringify(text)}, ${offset})`;
      const rep = await this._debuggerService.evaluate(evalCode);
      console.log('rep1', rep);
      if (!rep) {
        return { start: 0, end: 0, items: variableCompletions };
      }
      const matches = rep.result;
      console.log('matches length:', matches.length);

      // Replace single quotes with double quotes in matches string
      // Slice because return gets truncated
      let correctedMatches = matches.replace(/'/g, '"');

      // Debug: log the string to see the exact ellipses format
      console.log('Before ellipses removal:', correctedMatches);

      // TODO - why is the reply truncated????
      // Remove various ellipses patterns that cause JSON parsing issues
      correctedMatches = correctedMatches.replace(/, \.\.\./g, '');

      console.log('After ellipses removal:', correctedMatches);

      console.log('corrected matches', correctedMatches);

      try {
        parsedResult = JSON.parse(correctedMatches);
      } catch (error) {
        console.error('Failed to parse corrected matches:', error);
        return { start: 0, end: 0, items: variableCompletions };
      }

      // Combine variable completions with kernel completions
      const kernelCompletions: CompletionHandler.ICompletionItem[] =
        parsedResult.matches.map((match: string) => ({
          label: match,
          insertText: match
        }));

      items = [...kernelCompletions];
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
