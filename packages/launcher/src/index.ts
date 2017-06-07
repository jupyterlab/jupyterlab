// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, ArrayIterator, IIterator, map, toArray
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  VDomModel, VDomRenderer
} from '@jupyterlab/apputils';

import '../style/index.css';

/**
 * The command IDs used by the launcher plugin.
 */
export
namespace CommandIDs {
  export
  const show: string = 'launcher-jupyterlab:show';
};



/* tslint:disable */
/**
 * The launcher token.
 */
export
const ILauncher = new Token<ILauncher>('jupyter.services.launcher');
/* tslint:enable */


/**
 * The class name added to LauncherWidget instances.
 */
const LAUNCHER_CLASS = 'jp-LauncherWidget';

/**
 * The class name added to LauncherWidget image nodes.
 */
const IMAGE_CLASS = 'jp-LauncherWidget-image';

/**
 * The class name added to LauncherWidget text nodes.
 */
const TEXT_CLASS = 'jp-LauncherWidget-text';

/**
 * The class name added to LauncherWidget item nodes.
 */
const ITEM_CLASS = 'jp-LauncherWidget-item';

/**
 * The class name added to LauncherWidget body nodes.
 */
const BODY_CLASS = 'jp-LauncherWidget-body';


/**
 * The launcher interface.
 */
export
interface ILauncher {
  /**
   * Add a command item to the launcher, and trigger re-render event for parent
   * widget.
   *
   * @param options - The specification options for a launcher item.
   *
   * @returns A disposable that will remove the item from Launcher, and trigger
   * re-render event for parent widget.
   *
   */
  add(options: ILauncherItem): IDisposable;
}


/**
 * The specification for a launcher item.
 */
export
interface ILauncherItem {
  /**
   * The display name for the launcher item.
   */
  displayName: string;

  /**
   * The callback invoked to launch the item.
   *
   * The callback is invoked with a current working directory and the
   * name of the selected launcher item.  When the function returns
   * the launcher will close.
   */
  callback: (cwd: string, name: string) => Widget | Promise<Widget>;

  /**
   * The icon class for the launcher item.
   *
   * #### Notes
   * This class name will be added to the icon node for the visual
   * representation of the launcher item.
   *
   * Multiple class names can be separated with white space.
   *
   * The default value is an empty string.
   */
  iconClass?: string;

  /**
   * The icon label for the launcher item.
   *
   * #### Notes
   * This label will be added as text to the icon node for the visual
   * representation of the launcher item.
   *
   * The default value is an empty string.
   */
  iconLabel?: string;

  /**
   * The identifier for the launcher item.
   *
   * The default value is the displayName.
   */
  name?: string;

  /**
   * The category for the launcher item.
   *
   * The default value is the an empty string.
   */
  category?: string;

  /**
   * The rank for the launcher item.
   *
   * The rank is used when ordering launcher items
   * for display. Items are sorted in the following order:
   *   1. Rank (lower is better)
   *   2. Category (locale order)
   *   3. Display Name (locale order)
   *
   * The default rank is `Infinity`.
   */
  rank?: number;
}


/**
 * LauncherModel keeps track of the path to working directory and has a list of
 * LauncherItems, which the LauncherWidget will render.
 */
export
class LauncherModel extends VDomModel implements ILauncher {
  /**
   * Create a new launcher model.
   */
  constructor() {
    super();
  }

  /**
   * Add a command item to the launcher, and trigger re-render event for parent
   * widget.
   *
   * @param options - The specification options for a launcher item.
   *
   * @returns A disposable that will remove the item from Launcher, and trigger
   * re-render event for parent widget.
   *
   */
  add(options: ILauncherItem): IDisposable {
    // Create a copy of the options to circumvent mutations to the original.
    let item = Private.createItem(options);

    this._items.push(item);
    this.stateChanged.emit(void 0);

    return new DisposableDelegate(() => {
      ArrayExt.removeFirstOf(this._items, item);
      this.stateChanged.emit(void 0);
    });
  }

  /**
   * Return an iterator of launcher items.
   */
  items(): IIterator<ILauncherItem> {
    return new ArrayIterator(this._items);
  }

  private _items: ILauncherItem[] = [];
}


/**
 * A virtual-DOM-based widget for the Launcher.
 */
export
class LauncherWidget extends VDomRenderer<LauncherModel> {
  /**
   * Construct a new launcher widget.
   */
  constructor(options: LauncherWidget.IOptions) {
    super();
    this.cwd = options.cwd;
    this._callback = options.callback;
    this.addClass(LAUNCHER_CLASS);
  }

  /**
   * The cwd of the launcher.
   */
  readonly cwd: string;

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Render the launcher to virtual DOM nodes.
   */
  protected render(): VirtualNode | VirtualNode[] {
    // Create an iterator that yields rendered item nodes.
    let sorted = toArray(this.model.items()).sort(Private.sortCmp);
    let children = map(sorted, item => {
      let onclick = () => {
        let callback = item.callback;
        let value = callback(this.cwd, item.name);
        Promise.resolve(value).then(widget => {
          let callback = this._callback;
          callback(widget);
          this.dispose();
        });
      };
      let imageClass = `${item.iconClass} ${IMAGE_CLASS}`;
      let icon = h.div({ className: imageClass, onclick }, item.iconLabel);
      let title = item.displayName;
      let text = h.span({className: TEXT_CLASS, onclick, title }, title);
      let category = h.span({className: TEXT_CLASS, onclick }, item.category);
      return h.div({
        className: ITEM_CLASS,
      }, [icon, text, category]);
    });

    return h.div({ className: BODY_CLASS  }, toArray(children));
  }

  private _callback: (widget: Widget) => void;
}


/**
 * The namespace for `LauncherWidget` class statics.
 */
export
namespace LauncherWidget {
  /**
   * The options used to create a LauncherWidget.
   */
  export
  interface IOptions {
    /**
     * The cwd of the launcher.
     */
    cwd: string;

    /**
     * The callback used when an item is launched.
     */
    callback: (widget: Widget) => void;
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Create an item given item options.
   */
  export
  function createItem(options: ILauncherItem): ILauncherItem {
    return {
      ...options,
      category: options.category || '',
      name: options.name || options.name,
      iconClass: options.iconClass || '',
      iconLabel: options.iconLabel || '',
      rank: options.rank !== undefined ? options.rank : Infinity
    };
  }

  /**
   * A sort comparison function for a launcher item.
   */
  export
  function sortCmp(a: ILauncherItem, b: ILauncherItem): number {
    // First, compare by rank.
    let r1 = a.rank;
    let r2 = b.rank;
    if (r1 !== r2) {
      return r1 < r2 ? -1 : 1;  // Infinity safe
    }

    // Next, compare based on category.
    let d1 = a.category.localeCompare(b.category);
    if (d1 !== 0) {
      return d1;
    }

    // Finally, compare by display name.
    return a.displayName.localeCompare(b.displayName);
  }
}


