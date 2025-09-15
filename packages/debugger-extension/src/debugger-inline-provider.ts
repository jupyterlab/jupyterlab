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

    console.log('Current debugger variables:', variables);

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

    console.log('Available variable names:', variableNames);

    // Filter variables that match the prefix and extract suffix
    const variableCompletions: any[] = [];
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
    // TODO shouldn't need to check here, should be stopped if the console is open
    // Check if debugger has stopped threads (required for evaluation)
    if (!this._debuggerService.hasStoppedThreads()) {
      return { items: [] };
    }

    // TODO any -- this should come from ipython completions
    let items: any[] = [];

    try {
      const prefix = this.extractPrefix(request);

      // Skip if prefix is empty or just whitespace
      if (!prefix.trim()) {
        return { items: [] };
      }

      // Get variable-based completions
      const variableCompletions = this.getVariableCompletions(prefix);

      // Combine variable completions with regular completions
      items = [...variableCompletions, ...items];
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
