/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { searchIcon } from '@jupyterlab/ui-components';
import type { ReadonlyJSONObject } from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
import type { Message } from '@lumino/messaging';
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
 * The commands are tracked in memory, so the recently executed commands
 * are not preserved across page reloads.
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
    this.itemExecuted.connect(this._onItemExecuted, this);
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
    }

    // Refresh the search results.
    this.refresh();
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
   * Handle the `itemExecuted` signal of the command palette.
   */
  private _onItemExecuted(
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
  }

  private _maxRecentCommands = DEFAULT_MAX_RECENT_COMMANDS;
  private _recentCommands: Private.IRecentCommand[] = [];
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
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * An object which represents a recently executed command.
   */
  export interface IRecentCommand {
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
