// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  IInlineCompletionContext,
  IInlineCompletionProvider,
  InlineCompletionTriggerKind
} from '@jupyterlab/completer';
import type { CompletionHandler } from '@jupyterlab/completer';
import { IDebugger } from '@jupyterlab/debugger';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

/**
 * Type for inline completion items.
 */
interface ICompletionItem {
  insertText: string;
  filterText: string;
}

/**
 * Inline completion provider that uses debugger evaluation for suggestions.
 */
export class DebuggerInlineCompletionProvider implements IInlineCompletionProvider {
  readonly identifier = 'DebuggerInlineCompletionProvider';
  readonly name: string;

  constructor(protected options: DebuggerInlineCompletionProvider.IOptions) {
    const translator = options.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
    this.name = this._trans.__('Debugger');
    this._debuggerService = options.debuggerService;
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
    const variableCompletions: ICompletionItem[] = [];
    variableNames.forEach(name => {
      if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
        const suffix = name.slice(prefix.length);
        if (suffix.length > 0) {
          variableCompletions.push({
            insertText: suffix,
            filterText: name
          });
        }
      }
    });

    return variableCompletions;
  }

  /**
   * Fetch inline completion suggestions using debugger evaluation.
   */
  async fetch(
    request: CompletionHandler.IRequest,
    context: IInlineCompletionContext,
    trigger?: InlineCompletionTriggerKind
  ) {
    // Check if debugger has stopped threads (required for evaluation)
    if (!this._debuggerService.hasStoppedThreads()) {
      return { items: [] };
    }

    let items: ICompletionItem[] = [];

    try {
      const prefix = this.extractPrefix(request);
      const text = request.text;
      const offset = request.offset;
      console.log('text', text);
      console.log('offset', offset);

      // Skip if prefix is empty or just whitespace
      if (!prefix.trim()) {
        return { items: [] };
      }

      // Get variable-based completions
      const variableCompletions = this.getVariableCompletions(prefix);

      const pyCode = `
from IPython.core.completer import provisionalcompleter as _provisionalcompleter
from IPython.core.completer import rectify_completions as _rectify_completions
_EXPERIMENTAL_KEY_NAME = "_jupyter_types_experimental"

def funcToEval(code, cursor_pos):
    with _provisionalcompleter():
        raw_completions = get_ipython().Completer.completions(code, cursor_pos)
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
        else:
            s = cursor_pos
            e = cursor_pos
            matches = []

        try:
            with open("/tmp/ipykernel_debug.log", "a") as f:
                f.write(f"completions: {repr(completions)}")
        except Exception as e:
            pass

        return {
            "matches": matches,
            "cursor_end": e,
            "cursor_start": s,
            "status": "ok",
        }

`;

      const t = await this._debuggerService.evaluate(pyCode);
      console.log('tttttttttttttttt', t);

      const evalCode = `funcToEval("${text}", ${offset})`;
      const rep = await this._debuggerService.evaluate(evalCode);
      console.log('rep', rep);
      if (!rep) {
        return { items: [] };
      }
      const matches = rep.result;
      console.log('matches', matches);

      // Replace single quotes with double quotes in matches string
      const correctedMatches = matches.replace(/'/g, '"');
      console.log('corrected matches', correctedMatches);
      console.log('correctedMatches', correctedMatches);
      const ssss = JSON.parse(correctedMatches);
      console.log('ssss', ssss);
      // console.log('matches.matches', matches.matches);
      // Combine variable completions with kernel completions once those work
      items = [...variableCompletions, ...ssss.matches];
    } catch (error) {
      console.warn('Error fetching debugger completions:', error);
      // Return empty items on error
    }

    return { items };
  }

  private _trans: TranslationBundle;
  private _debuggerService: IDebugger;
}

export namespace DebuggerInlineCompletionProvider {
  export interface IOptions {
    debuggerService: IDebugger;
    translator?: ITranslator;
  }
}
