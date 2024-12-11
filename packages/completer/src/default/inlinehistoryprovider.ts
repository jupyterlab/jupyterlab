// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import type {
  IInlineCompletionContext,
  IInlineCompletionProvider,
  InlineCompletionTriggerKind
} from '../tokens';
import type { CompletionHandler } from '../handler';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { KernelMessage } from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { historyIcon, LabIcon } from '@jupyterlab/ui-components';

/**
 * An example inline completion provider using history to populate suggestions.
 */
export class HistoryInlineCompletionProvider
  implements IInlineCompletionProvider
{
  readonly identifier = '@jupyterlab/inline-completer:history';

  constructor(protected options: HistoryInlineCompletionProvider.IOptions) {
    const translator = options.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
  }

  get name(): string {
    return this._trans.__('History');
  }

  get icon(): LabIcon.ILabIcon {
    return historyIcon;
  }

  get schema(): ISettingRegistry.IProperty {
    return {
      properties: {
        maxSuggestions: {
          title: this._trans.__('Maximum number of suggestions'),
          description: this._trans.__(
            'The maximum number of suggestions to retrieve from history.'
          ),
          type: 'number'
        }
      },
      default: {
        // make this provider opt-in
        enabled: false,
        maxSuggestions: 100
      }
    };
  }

  configure(settings: { maxSuggestions: number }): void {
    this._maxSuggestions = settings.maxSuggestions ?? 100;
  }

  async fetch(
    request: CompletionHandler.IRequest,
    context: IInlineCompletionContext,
    trigger?: InlineCompletionTriggerKind
  ) {
    const kernel = context.session?.kernel;

    if (!kernel) {
      throw new Error('No kernel for completion request.');
    }

    const multiLinePrefix = request.text.slice(0, request.offset);
    const linePrefix = multiLinePrefix.split('\n').slice(-1)[0];
    const suffix = request.text.slice(request.offset).split('\n')[0];
    let historyRequest: KernelMessage.IHistoryRequestMsg['content'];

    const items = [];
    if (linePrefix === '') {
      historyRequest = {
        output: false,
        raw: true,
        hist_access_type: 'tail',
        n: this._maxSuggestions
      };
      const reply = await kernel.requestHistory(historyRequest);
      if (reply.content.status === 'ok') {
        let history = reply.content.history;

        const historyFrequencyMap = new Map();
        // Count the frequency of each element
        for (const entry of history.reverse()) {
          const sourceLines = entry[2] as string;
          historyFrequencyMap.set(
            sourceLines,
            (historyFrequencyMap.get(sourceLines) || 0) + 1
          );
        }
        const frequencyHistory = Array.from(historyFrequencyMap.entries());
        const sortedFrequencyHistory = frequencyHistory.sort((a, b) => {
          if (a[1] > b[1]) {
            return -1;
          } else if (a[1] < b[1]) {
            return 1;
          } else {
            return 0;
          }
        });
        for (const entry of sortedFrequencyHistory) {
          items.push({
            insertText: entry[0]
          });
        }
      }
    } else {
      historyRequest = {
        output: false,
        raw: true,
        hist_access_type: 'search',
        pattern: linePrefix + '*' + (suffix ? suffix + '*' : ''),
        unique: true,
        n: this._maxSuggestions
      };

      const reply = await kernel.requestHistory(historyRequest);
      if (reply.content.status === 'ok') {
        for (const entry of reply.content.history) {
          const sourceLines = (entry[2] as string).split('\n');
          for (let i = 0; i < sourceLines.length; i++) {
            const line = sourceLines[i];
            if (line.startsWith(linePrefix)) {
              let followingLines = line.slice(linePrefix.length);
              if (i + 1 < sourceLines.length) {
                followingLines += '\n' + sourceLines.slice(i + 1).join('\n');
              }
              if (suffix) {
                followingLines = followingLines.slice(
                  0,
                  followingLines.indexOf(suffix)
                );
              }
              items.push({
                insertText: followingLines
              });
            }
          }
        }
      }
    }

    return { items };
  }

  private _trans: TranslationBundle;
  private _maxSuggestions: number = 100;
}

export namespace HistoryInlineCompletionProvider {
  export interface IOptions {
    translator?: ITranslator;
  }
}
