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
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  Widget
} from '@phosphor/widgets';

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
//const IMAGE_CLASS = 'jp-LauncherWidget-image';

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
 * The class name added to LauncherWidget dialog node.
 */
const DIALOG_CLASS = 'jp-LauncherWidget-dialog';


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
   * name of the selected launcher item and returns a promise that
   * resolves to the widget that will replace the launcher widget.
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
   * The default value is the displayName.
   */
  category?: string;

  /**
   * The rank for the launcher item.
   *
   * The rank is used as a tie-breaker when ordering launcher items
   * for display. Items are sorted in the following order:
   *   1. Category (locale order)
   *   2. Rank (lower is better)
   *   3. Label (locale order)
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
    let item = JSON.parse(JSON.stringify(options));

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
  constructor() {
    super();
    this.addClass(LAUNCHER_CLASS);
  }

  /**
   * Render the launcher to virtual DOM nodes.
   */
  protected render(): VirtualNode | VirtualNode[] {
    // Create an iterator that yields rendered item nodes.
    let children = map(this.model.items(), item => {
      let text = h.span({className: TEXT_CLASS }, item.displayName);
      return h.div({
        className: ITEM_CLASS,
      }, [text]);
    });

    let body = h.div({ className: BODY_CLASS  }, toArray(children));

    return h.div({ className: DIALOG_CLASS }, [body]);
  }
}
