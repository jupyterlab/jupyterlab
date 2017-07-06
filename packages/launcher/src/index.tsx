// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, ArrayIterator, IIterator, map, each, toArray
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

import * as vdom from '@phosphor/virtualdom';

import {
  VDomModel, VDomRenderer
} from '@jupyterlab/apputils';

import '../style/index.css';


/**
 * We have configured the TSX transform to look for the h function in the local module.
 * */
const h = vdom.h;


/**
 * The class name added to Launcher instances.
 */
const LAUNCHER_CLASS = 'jp-Launcher';

/**
 * The known categories of launcher items and their default ordering.
 */
const KNOWN_CATEGORIES = ['Notebook', 'Console', 'Other'];

/**
 * These laucher item categories are known to have kernels, so the kernel icons are used.
 */
const KERNEL_CATEGORIES = ['Notebook', 'Console'];


/**
 * The command IDs used by the launcher plugin.
 */
export
namespace CommandIDs {
  export
  const show: string = 'launcher:show';
};



/* tslint:disable */
/**
 * The launcher token.
 */
export
const ILauncher = new Token<ILauncher>('jupyter.services.launcher');
/* tslint:enable */


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
   * The rank is used when ordering launcher items for display. After grouping into
   * categories, items are sorted in the following order:
   *   1. Rank (lower is better)
   *   3. Display Name (locale order)
   *
   * The default rank is `Infinity`.
   */
  rank?: number;

  /**
   * For items that hava kernel associated with them, the URL of the kernel icon.
   * 
   * This is not a CSS class, but the URL that points to the icon in the kernel spec.
   */
  kernelIconUrl?: string;
}


/**
 * LauncherModel keeps track of the path to working directory and has a list of
 * LauncherItems, which the Launcher will render.
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
class Launcher extends VDomRenderer<LauncherModel> {
  /**
   * Construct a new launcher widget.
   */
  constructor(options: Launcher.IOptions) {
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
  protected render(): vdom.VirtualNode | vdom.VirtualNode[] {
    // First group-by categories
    let categories = Object.create(null);
    each(this.model.items(), (item, index) => {
      let cat = item.category || "Other";
      if (!(cat in categories)) {
        categories[cat] = []
      } 
      categories[cat].push(item);
    });
    // Within each category sort by rank
    for (let cat in categories) {
      categories[cat] = categories[cat].sort(Private.sortCmp);
    }

    // Variable to help create sections
    let sections: vdom.VirtualNode[] = [];
    let section: vdom.VirtualNode;

    // Assemble the final ordered list of categories, beginning with KNOWN_CATEGORIES.
    let orderedCategories: string[] = [];
    each(KNOWN_CATEGORIES, (cat, index) => {
      orderedCategories.push(cat);
    });
    for (let cat in categories) {
      if (KNOWN_CATEGORIES.indexOf(cat) === -1) {
        orderedCategories.push(cat);
      }
    }

    // Now create the sections for each category
    each(orderedCategories, (cat, index) => {
      let iconClass = `${(categories[cat][0] as ILauncherItem).iconClass} jp-Launcher-sectionIcon jp-Launcher-icon`;
      let kernel = KERNEL_CATEGORIES.indexOf(cat) > -1;
      if (cat in categories) {
        section = (
          <div className="jp-Launcher-section">
            <div className="jp-Launcher-sectionHeader">
              {kernel && <div className={iconClass} />}
              <h2 className="jp-Launcher-sectionTitle">{cat}</h2>
            </div>
            <div className="jp-Launcher-cardContainer">
              {toArray(map(categories[cat], item => Card(kernel, (item as ILauncherItem), this, this._callback)))}
            </div>
          </div>
        );
        sections.push(section);
      }
    })

    // Wrap the sections in body and content divs.
    return (
      <div className="jp-Launcher-body">
        <div className="jp-Launcher-content">
        {sections}
        </div>
      </div>  
    );
  }

  private _callback: (widget: Widget) => void;
}


/**
 * The namespace for `Launcher` class statics.
 */
export
namespace Launcher {
  /**
   * The options used to create a Launcher.
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

    // Finally, compare by display name.
    return a.displayName.localeCompare(b.displayName);
  }
}

export
function Card(kernel: boolean, item: ILauncherItem, launcher: Launcher, launcherCallback: (widget: Widget) => void): vdom.VirtualElement {
  // Build the onclick handler.
  let onclick = () => {
    let callback = item.callback as any;
    let value = callback(launcher.cwd, item.name);
    Promise.resolve(value).then(widget => {
      launcherCallback(widget);
      launcher.dispose();
    });
  };
  // Add a data attribute for the category
  let dataset = {category: item.category};
  // Return the VDOM element.
  return (
    <div className="jp-LauncherCard" title={item.displayName} onclick={onclick} dataset={dataset}>
      <div className="jp-LauncherCard-icon">
          {(item.kernelIconUrl && kernel) && <img src={item.kernelIconUrl} className="jp-Launcher-kernelIcon" />}
          {(!item.kernelIconUrl && !kernel) && <div className={`${item.iconClass} jp-Launcher-icon`} />}
          {(!item.kernelIconUrl && kernel) && <div className="jp-LauncherCard-noKernelIcon">{item.displayName[0].toUpperCase()}</div>}          
      </div>
      <div className="jp-LauncherCard-label">{item.displayName}</div>
    </div>
  );
}
