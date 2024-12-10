// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SourceChange } from '@jupyter/ydoc';
import { CompletionHandler } from './handler';
import {
  CompletionTriggerKind,
  ICompletionContext,
  ICompletionProvider,
  IInlineCompleterSettings,
  IInlineCompletionList,
  IInlineCompletionProvider,
  InlineCompletionTriggerKind,
  IProviderReconciliator
} from './tokens';
import { Completer } from './widget';
import { Signal } from '@lumino/signaling';

// Shorthand for readability.
export type InlineResult =
  IInlineCompletionList<CompletionHandler.IInlineItem> | null;

/**
 * The reconciliator which is used to fetch and merge responses from multiple completion providers.
 */
export class ProviderReconciliator implements IProviderReconciliator {
  /**
   * Creates an instance of ProviderReconciliator.
   */
  constructor(options: ProviderReconciliator.IOptions) {
    this._providers = options.providers;
    this._inlineProviders = options.inlineProviders ?? [];
    this._inlineProvidersSettings = options.inlineProvidersSettings ?? {};
    this._context = options.context;
    this._timeout = options.timeout;
  }

  /**
   * Check for the providers which are applicable with the current context
   *
   * @return  List of applicable providers
   */
  protected async applicableProviders(): Promise<Array<ICompletionProvider>> {
    const isApplicablePromises = this._providers.map(p =>
      p.isApplicable(this._context)
    );
    const applicableProviders = await Promise.all(isApplicablePromises);
    return this._providers.filter((_, idx) => applicableProviders[idx]);
  }

  fetchInline(
    request: CompletionHandler.IRequest,
    trigger: InlineCompletionTriggerKind,
    isMiddleOfLine?: boolean
  ): Promise<InlineResult>[] {
    let promises: Promise<
      IInlineCompletionList<CompletionHandler.IInlineItem>
    >[] = [];
    const current = ++this._inlineFetching;
    for (const provider of this._inlineProviders) {
      const settings = this._inlineProvidersSettings[provider.identifier];
      if (
        trigger !== InlineCompletionTriggerKind.Invoke &&
        isMiddleOfLine &&
        !settings.autoFillInMiddle
      ) {
        // Skip if FIM is disabled
        continue;
      }
      let delay = 0;
      if (trigger === InlineCompletionTriggerKind.Automatic) {
        delay = settings.debouncerDelay;
      }

      const fetch = (): Promise<InlineResult> => {
        const promise = provider
          .fetch(request, { ...this._context, triggerKind: trigger })
          .then(completionList => {
            return {
              ...completionList,
              items: completionList.items.map(item => {
                const newItem = item as CompletionHandler.IInlineItem;
                newItem.stream = new Signal(newItem);
                newItem.provider = provider;
                void this._stream(newItem, provider);
                return newItem;
              })
            };
          });
        const timeoutPromise = new Promise<null>(resolve => {
          return setTimeout(() => resolve(null), delay + settings.timeout);
        });
        return Promise.race([promise, timeoutPromise]);
      };
      const promise =
        delay === 0
          ? fetch()
          : new Promise<InlineResult>((resolve, reject) => {
              return setTimeout(() => {
                if (current != this._inlineFetching) {
                  // User pressed another key or explicitly requested completions since.
                  return reject(null);
                } else {
                  return resolve(fetch());
                }
              }, delay);
            });

      // Wrap promise and return error in case of failure.
      promises.push(promise.catch(p => p));
    }
    return promises;
  }

  private async _stream(
    item: CompletionHandler.IInlineItem,
    provider: IInlineCompletionProvider
  ) {
    if (!item.isIncomplete || !provider.stream || !item.token) {
      return;
    }
    const streamed = item.stream as Signal<
      CompletionHandler.IInlineItem,
      CompletionHandler.StraemEvent
    >;
    const token = item.token;
    item.token = undefined;

    // Notify that streaming started.
    item.streaming = true;
    streamed.emit(CompletionHandler.StraemEvent.opened);

    for await (const reply of provider.stream(token)) {
      const updated = reply.response;
      const addition = updated.insertText.substring(item.insertText.length);
      // Stream an update.
      item.insertText = updated.insertText;
      item.lastStreamed = addition;
      item.error = reply.response.error;
      streamed.emit(CompletionHandler.StraemEvent.update);
    }

    // Notify that streaming is no longer in progress.
    item.isIncomplete = false;
    item.lastStreamed = undefined;
    item.streaming = false;
    streamed.emit(CompletionHandler.StraemEvent.closed);
  }

  /**
   * Fetch response from multiple providers, If a provider can not return
   * the response for a completer request before timeout,
   * the result of this provider will be ignored.
   *
   * @param {CompletionHandler.IRequest} request - The completion request.
   */
  async fetch(
    request: CompletionHandler.IRequest,
    trigger?: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply | null> {
    const current = ++this._fetching;
    let promises: Promise<CompletionHandler.ICompletionItemsReply | null>[] =
      [];
    const applicableProviders = await this.applicableProviders();
    for (const provider of applicableProviders) {
      let promise: Promise<CompletionHandler.ICompletionItemsReply | null>;
      promise = provider.fetch(request, this._context, trigger).then(reply => {
        if (current !== this._fetching) {
          return Promise.reject(void 0);
        }
        const items = reply.items.map(el => ({
          ...el,
          resolve: this._resolveFactory(provider, el)
        }));
        return { ...reply, items };
      });

      const timeoutPromise = new Promise<null>(resolve => {
        return setTimeout(() => resolve(null), this._timeout);
      });
      promise = Promise.race([promise, timeoutPromise]);
      // Wrap promise and return error in case of failure.
      promises.push(promise.catch(p => p));
    }
    // TODO: maybe use `Promise.allSettled` once library is at es2020 instead of adding a catch.
    const combinedPromise = Promise.all(promises);
    return this._mergeCompletions(combinedPromise);
  }

  /**
   * Check if completer should make request to fetch completion responses
   * on user typing. If the provider with highest rank does not have
   * `shouldShowContinuousHint` method, a default one will be used.
   *
   * @param completerIsVisible - The visible status of completer widget.
   * @param changed - CodeMirror changed argument.
   */
  async shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange
  ): Promise<boolean> {
    const applicableProviders = await this.applicableProviders();
    if (applicableProviders.length === 0) {
      return false;
    }
    if (applicableProviders[0].shouldShowContinuousHint) {
      return applicableProviders[0].shouldShowContinuousHint(
        completerIsVisible,
        changed,
        this._context
      );
    }
    return this._defaultShouldShowContinuousHint(completerIsVisible, changed);
  }

  private _alignPrefixes(
    replies: CompletionHandler.ICompletionItemsReply[],
    minStart: number,
    maxStart: number
  ): CompletionHandler.ICompletionItemsReply[] {
    if (minStart != maxStart) {
      const editor = this._context.editor;
      if (!editor) {
        return replies;
      }
      const cursor = editor.getCursorPosition();
      const line = editor.getLine(cursor.line);
      if (!line) {
        return replies;
      }
      const lineOffset = editor.getOffsetAt({ line: cursor.line, column: 0 });

      return replies.map(reply => {
        const prefixStart = Math.max(reply.start - lineOffset, 0);
        const prefixEnd = Math.max(maxStart - lineOffset, 0);
        // No prefix to strip, return as-is.
        if (prefixStart == prefixEnd) {
          return reply;
        }
        const prefix = line.substring(prefixStart, prefixEnd);
        return {
          ...reply,
          items: reply.items.map(item => {
            let insertText = item.insertText || item.label;
            item.insertText = insertText.startsWith(prefix)
              ? insertText.slice(prefix.length)
              : insertText;
            return item;
          })
        };
      });
    }
    return replies;
  }

  private async _mergeCompletions(
    promises: Promise<(CompletionHandler.ICompletionItemsReply | null)[]>
  ): Promise<CompletionHandler.ICompletionItemsReply | null> {
    let replies = (await promises).filter(reply => {
      // Ignore it errors out.
      if (!reply || reply instanceof Error) {
        return false;
      }
      // Ignore if no matches.
      if (!reply.items.length) {
        return false;
      }
      // Otherwise keep.
      return true;
    }) as CompletionHandler.ICompletionItemsReply[];

    // Fast path for a single reply or no replies.
    if (replies.length == 0) {
      return null;
    } else if (replies.length == 1) {
      return replies[0];
    }

    const minEnd = Math.min(...replies.map(reply => reply.end));

    // If any of the replies uses a wider range, we need to align them
    // so that all responses use the same range.
    const starts = replies.map(reply => reply.start);
    const minStart = Math.min(...starts);
    const maxStart = Math.max(...starts);

    replies = this._alignPrefixes(replies, minStart, maxStart);

    const insertTextSet = new Set<string>();
    const mergedItems = new Array<CompletionHandler.ICompletionItem>();

    for (const reply of replies) {
      reply.items.forEach(item => {
        // IPython returns 'import' and 'import '; while the latter is more useful,
        // user should not see two suggestions with identical labels and nearly-identical
        // behaviour as they could not distinguish the two either way.
        let text = (item.insertText || item.label).trim();
        if (insertTextSet.has(text)) {
          return;
        }

        insertTextSet.add(text);
        mergedItems.push(item);
      });
    }
    return {
      start: maxStart,
      end: minEnd,
      items: mergedItems
    };
  }

  private _defaultShouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange
  ): boolean {
    return (
      !completerIsVisible &&
      (changed.sourceChange == null ||
        changed.sourceChange.some(
          delta => delta.insert != null && delta.insert.length > 0
        ))
    );
  }

  private _resolveFactory = (
    provider: ICompletionProvider,
    el: CompletionHandler.ICompletionItem
  ) =>
    provider.resolve
      ? (patch?: Completer.IPatch) =>
          provider.resolve!(el, this._context, patch)
      : undefined;

  /**
   * List of available providers.
   */
  private _providers: Array<ICompletionProvider>;

  /**
   * List of inline providers.
   */
  private _inlineProviders: Array<IInlineCompletionProvider>;

  /**
   * Inline providers settings.
   */
  private _inlineProvidersSettings: IInlineCompleterSettings['providers'];

  /**
   * Current completer context.
   */
  private _context: ICompletionContext;

  /**
   * Timeout for the fetch request.
   */
  private _timeout: number;

  /**
   * Counter to reject current provider response if a new fetch request is created.
   */
  private _fetching = 0;

  /**
   * Counter to reject current inline provider response if a new `inlineFetch` request is created.
   */
  private _inlineFetching = 0;
}

export namespace ProviderReconciliator {
  /**
   * The instantiation options for provider reconciliator.
   */
  export interface IOptions {
    /**
     * Completion context that will be used in the `fetch` method of provider.
     */
    context: ICompletionContext;
    /**
     * List of completion providers, assumed to contain at least one provider.
     */
    providers: ICompletionProvider[];
    /**
     * List of inline completion providers, may be empty.
     */
    inlineProviders?: IInlineCompletionProvider[];

    inlineProvidersSettings?: IInlineCompleterSettings['providers'];
    /**
     * How long should we wait for each of the providers to resolve `fetch` promise
     */
    timeout: number;
  }
}
