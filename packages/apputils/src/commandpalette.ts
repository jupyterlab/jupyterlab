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
 * The default maximum number of recent commands.
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
    }, this);
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
 * A command palette which pins the commands recently triggered from it to
 * the top while the search query is empty.
 *
 * #### Notes
 * Commands executed from a menu, a keyboard shortcut or the command registry
 * are not tracked. Use `recentCommands` and `recentsChanged` to persist the
 * history.
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
   * The maximum number of recent commands.
   *
   * #### Notes
   * Setting the limit to `0` disables the tracking and clears the history.
   * The default value is `5`.
   */
  get maxRecentCommands(): number {
    return this._maxRecentCommands;
  }

  set maxRecentCommands(value: number) {
    this._maxRecentCommands = Math.max(0, Math.floor(value)) || 0;
    this.recentCommands = this._recentCommands;
  }

  /**
   * The recent commands, from most to least recently triggered.
   *
   * #### Notes
   * Assigned entries are deduplicated and truncated to `maxRecentCommands`.
   */
  get recentCommands(): ReadonlyArray<RecentsCommandPalette.IRecentCommand> {
    return this._recentCommands;
  }

  set recentCommands(
    value: ReadonlyArray<RecentsCommandPalette.IRecentCommand>
  ) {
    const recents: RecentsCommandPalette.IRecentCommand[] = [];
    for (const entry of value) {
      if (recents.length >= this._maxRecentCommands) {
        break;
      }
      if (!recents.some(recent => Private.isSameCommand(recent, entry))) {
        recents.push({ command: entry.command, args: entry.args });
      }
    }

    const current = this._recentCommands;
    if (
      recents.length === current.length &&
      recents.every((recent, i) => Private.isSameCommand(recent, current[i]))
    ) {
      return;
    }

    this._recentCommands = recents;
    this._recentsChanged.emit(undefined);
    this.refresh();
  }

  /**
   * A signal emitted when the recent commands change.
   */
  get recentsChanged(): ISignal<this, void> {
    return this._recentsChanged;
  }

  /**
   * Test whether a command item matches a recent command.
   */
  isRecent(item: CommandPalette.IItem): boolean {
    return this._recentCommands.some(recent =>
      Private.isSameCommand(recent, item)
    );
  }

  /**
   * Create the search results for a query.
   *
   * #### Notes
   * While the query is empty, the recent commands are pinned to the top,
   * without a header, and any other item for a pinned command is dropped
   * from the results. Otherwise, the default results are returned.
   */
  protected search(query: string): CommandPalette.SearchResult[] {
    const recents = this._resolveRecentItems();
    if (recents.length === 0 || query.trim()) {
      return super.search(query);
    }

    const pinned = recents.map(
      (item): CommandPalette.IItemResult => ({
        type: 'item',
        item,
        indices: null
      })
    );
    const others = this.items.filter(
      item => !recents.some(recent => Private.isSameCommand(recent, item))
    );
    return [...pinned, ...CommandPalette.search(others, query)];
  }

  /**
   * Get the index of the result to activate for new search results.
   *
   * #### Notes
   * While the recent commands are pinned, the first enabled one is active,
   * so that `Enter` runs it.
   */
  protected initialActiveIndex(
    query: string,
    results: ReadonlyArray<CommandPalette.SearchResult>
  ): number {
    const pinned = query.trim() ? 0 : this._resolveRecentItems().length;
    if (pinned === 0) {
      return super.initialActiveIndex(query, results);
    }
    return results
      .slice(0, pinned)
      .findIndex(result => result.type === 'item' && result.item.isEnabled);
  }

  /**
   * Resolve the recent commands to the visible palette items.
   *
   * #### Notes
   * Disabled items stay pinned, so that the pinned items do not move when
   * the application context changes.
   */
  private _resolveRecentItems(): CommandPalette.IItem[] {
    const items: CommandPalette.IItem[] = [];
    for (const recent of this._recentCommands) {
      const item = this.items.find(candidate =>
        Private.isSameCommand(candidate, recent)
      );
      if (item?.isVisible) {
        items.push(item);
      }
    }
    return items;
  }

  /**
   * Handle the `itemTriggered` signal of the command palette.
   */
  private _onItemTriggered(
    sender: CommandPalette,
    item: CommandPalette.IItem
  ): void {
    const { command, args } = item;
    this.recentCommands = [{ command, args }, ...this._recentCommands];
  }

  private _maxRecentCommands = DEFAULT_MAX_RECENT_COMMANDS;
  private _recentCommands: RecentsCommandPalette.IRecentCommand[] = [];
  private _recentsChanged = new Signal<this, void>(this);
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
     * The maximum number of recent commands. The default value is `5`.
     */
    maxRecentCommands?: number;
  }

  /**
   * A recently triggered command.
   *
   * #### Notes
   * The interface extends a JSON object so that the history can be saved.
   */
  export interface IRecentCommand extends ReadonlyPartialJSONObject {
    /**
     * The command which was triggered.
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
   * Test whether two entries refer to the same command and arguments.
   */
  export function isSameCommand(
    a: RecentsCommandPalette.IRecentCommand | CommandPalette.IItem,
    b: RecentsCommandPalette.IRecentCommand | CommandPalette.IItem
  ): boolean {
    return a.command === b.command && JSONExt.deepEqual(a.args, b.args);
  }
}
