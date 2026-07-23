/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { searchIcon } from '@jupyterlab/ui-components';
import type {
  ReadonlyJSONObject,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { CommandPalette, Panel, Widget } from '@lumino/widgets';

/**
 * Class name identifying the input group with search icon.
 */
const SEARCH_ICON_GROUP_CLASS = 'jp-SearchIconGroup';

/**
 * The default maximum number of recently executed commands to display.
 */
const DEFAULT_MAX_RECENT_COMMANDS = 5;

/**
 * Wrap the command palette in a modal to make it more usable.
 */
export class ModalCommandPalette extends Panel {
  constructor(options: ModalCommandPalette.IOptions) {
    super();
    this._options = options;

    this.addClass('jp-ModalCommandPalette');
    this.addClass('jp-ThemedContainer');
    this.id = 'modal-command-palette';
    this.palette = options.commandPalette;
    this._commandPalette.commands.commandExecuted.connect(() => {
      if (this.isAttached && this.isVisible) {
        this.hideAndReset();
      }
    });
    // required to properly receive blur and focus events;
    // selection of items with mouse may not work without this.
    this.node.tabIndex = 0;
  }

  get palette(): CommandPalette {
    return this._commandPalette;
  }

  set palette(value: CommandPalette) {
    this._commandPalette = value;
    if (!this.searchIconGroup) {
      this._commandPalette.inputNode.insertAdjacentElement(
        'afterend',
        this.createSearchIconGroup()
      );
    }
    this.addWidget(value);
    this.hideAndReset();
  }

  attach(): void {
    Widget.attach(this, document.body);
  }

  detach(): void {
    Widget.detach(this);
  }

  /**
   * Hide the modal command palette and reset its search.
   */
  hideAndReset(): void {
    this.hide();
    this._commandPalette.inputNode.value = '';
    this._commandPalette.refresh();
    this._options.restore?.();
  }

  /**
   * Handle incoming events.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
      case 'blur': {
        // if the focus shifted outside of this DOM element, hide and reset.
        if (
          // focus went away from child element
          this.node.contains(event.target as HTMLElement) &&
          // and it did NOT go to another child element but someplace else
          !this.node.contains(
            (event as MouseEvent).relatedTarget as HTMLElement
          )
        ) {
          event.stopPropagation();
          this.hideAndReset();
        }
        break;
      }
      case 'contextmenu':
        event.preventDefault();
        event.stopPropagation();
        break;
      default:
        break;
    }
  }

  /**
   * Find the element with search icon group.
   */
  protected get searchIconGroup(): HTMLDivElement | undefined {
    return this._commandPalette.node.getElementsByClassName(
      SEARCH_ICON_GROUP_CLASS
    )[0] as HTMLDivElement;
  }

  /**
   * Create element with search icon group.
   */
  protected createSearchIconGroup(): HTMLDivElement {
    const inputGroup = document.createElement('div');
    inputGroup.classList.add(SEARCH_ICON_GROUP_CLASS);
    searchIcon.render(inputGroup);
    return inputGroup;
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('keydown', this, true);
    this.node.addEventListener('contextmenu', this, true);
  }

  /**
   *  A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this, true);
    this.node.removeEventListener('contextmenu', this, true);
  }

  protected onBeforeHide(msg: Message): void {
    document.removeEventListener('blur', this, true);
  }

  protected onAfterShow(msg: Message): void {
    document.addEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'activate-request'` message.
   */
  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      this.show();
      this._commandPalette.activate();
    }
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    // Check for escape key
    switch (event.key) {
      case 'Escape':
        event.stopPropagation();
        event.preventDefault();
        this.hideAndReset();
        break;
      default:
        break;
    }
  }

  private _commandPalette: CommandPalette;
  private _options: ModalCommandPalette.IOptions;
}

export namespace ModalCommandPalette {
  export interface IOptions {
    commandPalette: CommandPalette;
    /**
     * A callback executed when the modal palette is closed.
     * Used to restore focus to the previously active widget.
     */
    restore?: () => void;
  }
}

/**
 * A command palette which displays the recently executed commands at the
 * top of the palette while the search input is empty.
 *
 * #### Notes
 * Only the commands executed from the palette itself are tracked, either
 * by clicking an item or by pressing `Enter` while the item is active.
 * Commands triggered from a menu, a keyboard shortcut, or a direct
 * invocation of the command registry are not tracked.
 *
 * The commands are tracked in memory. The `recentCommands` accessors and
 * the `recentsChanged` signal allow an external actor to save and restore
 * the recently executed commands, for example to preserve them across
 * page reloads.
 */
export class RecentsCommandPalette extends CommandPalette {
  /**
   * Construct a new recents command palette.
   *
   * @param options - The options for creating the command palette.
   */
  constructor(options: RecentsCommandPalette.IOptions) {
    super(options);
    if (options.maxRecentCommands !== undefined) {
      this.maxRecentCommands = options.maxRecentCommands;
    }
    this.itemTriggered.connect(this._onItemTriggered, this);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._recentCommands.length = 0;
    this._resolvedRecents.clear();
    super.dispose();
  }

  /**
   * The maximum number of recently executed commands to display.
   *
   * #### Notes
   * When the limit is positive, the most recently executed commands
   * are displayed at the top of the palette when the search query is
   * empty. When searching, the results are ordered as usual.
   *
   * Setting the limit to `0` disables the tracking and display of the
   * recently executed commands, and clears the existing history.
   *
   * Setting the limit to a value smaller than the current history
   * drops the oldest commands from the history.
   *
   * The default value is `5`.
   */
  get maxRecentCommands(): number {
    return this._maxRecentCommands;
  }

  set maxRecentCommands(value: number) {
    // Normalize the limit to a non-negative integer, coercing `NaN` to `0`.
    value = Math.max(0, Math.floor(value)) || 0;

    // Bail if the limit does not change.
    if (this._maxRecentCommands === value) {
      return;
    }

    // Update the limit.
    this._maxRecentCommands = value;

    // Drop the oldest commands which exceed the new limit.
    if (this._recentCommands.length > value) {
      this._recentCommands.length = value;
      this._recentsChanged.emit(undefined);
    }

    // Refresh the search results.
    this.refresh();
  }

  /**
   * The recently executed commands, ordered from most recently executed
   * to least recently executed.
   *
   * #### Notes
   * Assigning to this property replaces the command history, for example
   * to restore the recently executed commands from an external storage.
   *
   * The assigned entries are normalized: an entry which is not a valid
   * recent command is ignored, duplicate entries are deduplicated, and
   * the history is truncated to the `maxRecentCommands` limit.
   */
  get recentCommands(): ReadonlyArray<RecentsCommandPalette.IRecentCommand> {
    return [...this._recentCommands];
  }

  set recentCommands(
    value: ReadonlyArray<RecentsCommandPalette.IRecentCommand>
  ) {
    // Normalize the entries, dropping the ones which do not conform to
    // the expected shape, e.g. corrupted entries from an external storage.
    const normalized: RecentsCommandPalette.IRecentCommand[] = [];
    for (const entry of value as ReadonlyArray<unknown>) {
      if (normalized.length >= this._maxRecentCommands) {
        break;
      }
      if (!Private.isRecentCommand(entry)) {
        continue;
      }
      const { command, args } = entry;
      const duplicate = normalized.some(recent => {
        return (
          recent.command === command && JSONExt.deepEqual(recent.args, args)
        );
      });
      if (!duplicate) {
        normalized.push({ command, args });
      }
    }

    // Bail if the history does not change.
    const unchanged =
      normalized.length === this._recentCommands.length &&
      normalized.every((recent, index) => {
        const current = this._recentCommands[index];
        return (
          recent.command === current.command &&
          JSONExt.deepEqual(recent.args, current.args)
        );
      });
    if (unchanged) {
      return;
    }

    // Update the history and refresh the search results.
    this._recentCommands = normalized;
    this._recentsChanged.emit(undefined);
    this.refresh();
  }

  /**
   * A signal emitted when the recently executed commands change.
   *
   * #### Notes
   * The signal is emitted when a command is executed from the palette,
   * when the history is truncated by a lower `maxRecentCommands` limit,
   * and when the history is replaced via the `recentCommands` setter.
   */
  get recentsChanged(): ISignal<this, void> {
    return this._recentsChanged;
  }

  /**
   * Test whether a command item is a recently executed command.
   *
   * @param item - The command item of interest.
   *
   * @returns Whether the item was resolved as a recently executed
   *   command by the most recent update of the palette.
   *
   * #### Notes
   * This method can be used by a renderer to decorate the recently
   * executed commands.
   */
  isRecent(item: CommandPalette.IItem): boolean {
    return this._resolvedRecents.has(item);
  }

  /**
   * Generate the search results for the given query text.
   *
   * @param query - The query text of the palette search input.
   *
   * @returns The array of search results to display.
   *
   * #### Notes
   * When the query is empty, the recently executed commands are pinned
   * to the top of the palette, without a category header, and the
   * remaining items are listed after them in the default order.
   *
   * When searching, the default results are returned, ordered by match
   * quality.
   */
  protected search(query: string): CommandPalette.SearchResult[] {
    // Resolve the recently executed commands to their palette items.
    const recentItems = this._resolveRecentItems();

    // Remember the resolved items for `isRecent()`.
    this._resolvedRecents = new Set(recentItems);

    // Use the default search behavior when there is a query or when
    // there are no recently executed commands to pin.
    if (recentItems.length === 0 || query.replace(/\s+/g, '')) {
      return super.search(query);
    }

    // Pin the recently executed commands to the top of the palette,
    // without a category header.
    const pinned: CommandPalette.SearchResult[] = recentItems.map(item => {
      return { type: 'item', item, indices: null };
    });

    // List the other items after the pinned items, in the default order,
    // so that a pinned item is not displayed twice.
    const others = this.items.filter(item => !this._resolvedRecents.has(item));
    return [...pinned, ...CommandPalette.search(others, query)];
  }

  /**
   * Resolve the recently executed commands to their palette items.
   *
   * @returns The resolved items, ordered from most recently executed to
   *   least recently executed.
   *
   * #### Notes
   * A command which does not resolve to a visible and enabled item is
   * ignored. A disabled item cannot be executed again, so it is
   * displayed in its own category instead until it is enabled again.
   */
  private _resolveRecentItems(): CommandPalette.IItem[] {
    const resolved: CommandPalette.IItem[] = [];
    for (const recent of this._recentCommands) {
      const item = this.items.find(candidate => {
        return (
          candidate.command === recent.command &&
          JSONExt.deepEqual(candidate.args, recent.args)
        );
      });
      if (item && item.isVisible && item.isEnabled) {
        resolved.push(item);
      }
    }
    return resolved;
  }

  /**
   * Handle the `itemTriggered` signal of the command palette.
   */
  private _onItemTriggered(
    sender: CommandPalette,
    item: CommandPalette.IItem
  ): void {
    // Bail if recently executed commands are not tracked.
    if (this._maxRecentCommands === 0) {
      return;
    }

    // Remove any existing entry for the command.
    const index = this._recentCommands.findIndex(recent => {
      return (
        recent.command === item.command &&
        JSONExt.deepEqual(recent.args, item.args)
      );
    });
    if (index !== -1) {
      this._recentCommands.splice(index, 1);
    }

    // Add the command to the front of the history.
    this._recentCommands.unshift({ command: item.command, args: item.args });

    // Drop the oldest command if the history exceeds the limit.
    if (this._recentCommands.length > this._maxRecentCommands) {
      this._recentCommands.length = this._maxRecentCommands;
    }

    this._recentsChanged.emit(undefined);
  }

  private _maxRecentCommands = DEFAULT_MAX_RECENT_COMMANDS;
  private _recentCommands: RecentsCommandPalette.IRecentCommand[] = [];
  private _recentsChanged = new Signal<this, void>(this);
  private _resolvedRecents = new Set<CommandPalette.IItem>();
}

/**
 * The namespace for the `RecentsCommandPalette` class statics.
 */
export namespace RecentsCommandPalette {
  /**
   * An options object for creating a recents command palette.
   */
  export interface IOptions extends CommandPalette.IOptions {
    /**
     * The maximum number of recently executed commands to display.
     *
     * The default value is `5`.
     */
    maxRecentCommands?: number;
  }

  /**
   * An object which represents a recently executed command.
   *
   * #### Notes
   * The interface extends a read-only JSON object so that the recently
   * executed commands can be serialized, for example to preserve them
   * across page reloads.
   */
  export interface IRecentCommand extends ReadonlyPartialJSONObject {
    /**
     * The command which was executed.
     */
    readonly command: string;

    /**
     * The arguments for the command.
     */
    readonly args: ReadonlyJSONObject;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Test whether a value is a valid recent command entry.
   */
  export function isRecentCommand(
    value: unknown
  ): value is RecentsCommandPalette.IRecentCommand {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const entry = value as { command?: unknown; args?: unknown };
    return (
      typeof entry.command === 'string' &&
      typeof entry.args === 'object' &&
      entry.args !== null &&
      !Array.isArray(entry.args)
    );
  }
}
