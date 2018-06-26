// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  showErrorMessage, VDomModel, VDomRenderer
} from '@jupyterlab/apputils';

import {
  ArrayExt, ArrayIterator, IIterator, map, each, toArray
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Token, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  Widget
} from '@phosphor/widgets';

import * as React from 'react';

import '../style/index.css';


/**
 * The class name added to Launcher instances.
 */
const LAUNCHER_CLASS = 'jp-Launcher';

/**
 * The known categories of launcher items and their default ordering.
 */
const KNOWN_CATEGORIES = ['Notebook', 'Console', 'Other'];

/**
 * These laucher item categories are known to have kernels, so the kernel icons
 * are used.
 */
const KERNEL_CATEGORIES = ['Notebook', 'Console'];


/* tslint:disable */
/**
 * The launcher token.
 */
export
const ILauncher = new Token<ILauncher>('@jupyterlab/launcher:ILauncher');
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
  add(options: ILauncher.IItemOptions): IDisposable;
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
  add(options: ILauncher.IItemOptions): IDisposable {
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
  items(): IIterator<ILauncher.IItemOptions> {
    return new ArrayIterator(this._items);
  }

  private _items: ILauncher.IItemOptions[] = [];
}


/**
 * A virtual-DOM-based widget for the Launcher.
 */
export
class Launcher extends VDomRenderer<LauncherModel> {
  /**
   * Construct a new launcher widget.
   */
  constructor(options: ILauncher.IOptions) {
    super();
    this._cwd = options.cwd;
    this._callback = options.callback;
    this._commands = options.commands;
    this.addClass(LAUNCHER_CLASS);
  }

  /**
   * The cwd of the launcher.
   */
  get cwd(): string {
    return this._cwd;
  }
  set cwd(value: string) {
    this._cwd = value;
    this.update();
  }

  /**
   * Whether there is a pending item being launched.
   */
  get pending(): boolean {
    return this._pending;
  }
  set pending(value: boolean) {
    this._pending = value;
  }

  /**
   * Render the launcher to virtual DOM nodes.
   */
  protected render(): React.ReactElement<any> {
    // Bail if there is no model.
    if (!this.model) {
      return null;
    }

    // First group-by categories
    let categories = Object.create(null);
    each(this.model.items(), (item, index) => {
      let cat = item.category || 'Other';
      if (!(cat in categories)) {
        categories[cat] = [];
      }
      categories[cat].push(item);
    });
    // Within each category sort by rank
    for (let cat in categories) {
      categories[cat] = categories[cat]
        .sort((a: ILauncher.IItemOptions, b: ILauncher.IItemOptions) => {
          return Private.sortCmp(a, b, this._cwd, this._commands);
        });
    }

    // Variable to help create sections
    let sections: React.ReactElement<any>[] = [];
    let section: React.ReactElement<any>;

    // Assemble the final ordered list of categories, beginning with
    // KNOWN_CATEGORIES.
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
    orderedCategories.forEach(cat => {
      const item = categories[cat][0] as ILauncher.IItemOptions;
      let iconClass =
        `${this._commands.iconClass(item.command, {...item.args, cwd: this.cwd})} ` +
        'jp-Launcher-sectionIcon jp-Launcher-icon';
      let kernel = KERNEL_CATEGORIES.indexOf(cat) > -1;
      if (cat in categories) {
        section = (
          <div className='jp-Launcher-section' key={cat}>
            <div className='jp-Launcher-sectionHeader'>
              {kernel && <div className={iconClass} />}
              <h2 className='jp-Launcher-sectionTitle'>{cat}</h2>
            </div>
            <div className='jp-Launcher-cardContainer'>
              {toArray(map(categories[cat], (item: ILauncher.IItemOptions) => {
                return Card(kernel, item, this, this._commands, this._callback);
              }))}
            </div>
          </div>
        );
        sections.push(section);
      }
    });

    // Wrap the sections in body and content divs.
    return (
      <div className='jp-Launcher-body'>
        <div className='jp-Launcher-content'>
          <div className='jp-Launcher-cwd'>
            <h3>{this.cwd}</h3>
          </div>
          {sections}
        </div>
      </div>
    );
  }

  private _commands: CommandRegistry;
  private _callback: (widget: Widget) => void;
  private _pending = false;
  private _cwd = '';
}


/**
 * The namespace for `ILauncher` class statics.
 */
export
namespace ILauncher {
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
     * The command registry used by the launcher.
     */
    commands: CommandRegistry;

    /**
     * The callback used when an item is launched.
     */
    callback: (widget: Widget) => void;
  }

  /**
   * The options used to create a launcher item.
   */
  export
  interface IItemOptions {
    /**
     * The command ID for the launcher item.
     *
     * #### Notes
     * If the command's `execute` method returns a `Widget` or
     * a promise that resolves with a `Widget`, then that widget will
     * replace the launcher in the same location of the application
     * shell. If the `execute` method does something else
     * (i.e., create a modal dialog), then the launcher will not be
     * disposed.
     */
    command: string;

    /**
     * The arguments given to the command for
     * creating the launcher item.
     *
     * ### Notes
     * The launcher will also add the current working
     * directory of the filebrowser in the `cwd` field
     * of the args, which a command may use to create
     * the activity with respect to the right directory.
     */
    args?: ReadonlyJSONObject;

    /**
     * The category for the launcher item.
     *
     * The default value is the an empty string.
     */
    category?: string;

    /**
     * The rank for the launcher item.
     *
     * The rank is used when ordering launcher items for display. After grouping
     * into categories, items are sorted in the following order:
     *   1. Rank (lower is better)
     *   3. Display Name (locale order)
     *
     * The default rank is `Infinity`.
     */
    rank?: number;

    /**
     * For items that have a kernel associated with them, the URL of the kernel
     * icon.
     *
     * This is not a CSS class, but the URL that points to the icon in the kernel
     * spec.
     */
    kernelIconUrl?: string;
  }


}


/**
 * A pure tsx component for a launcher card.
 *
 * @param kernel - whether the item takes uses a kernel.
 *
 * @param item - the launcher item to render.
 *
 * @param launcher - the Launcher instance to which this is added.
 *
 * @param launcherCallback - a callback to call after an item has been launched.
 *
 * @returns a vdom `VirtualElement` for the launcher card.
 */
function Card(kernel: boolean, item: ILauncher.IItemOptions, launcher: Launcher, commands: CommandRegistry, launcherCallback: (widget: Widget) => void): React.ReactElement<any> {
  // Get some properties of the command
  const command = item.command;
  const args = {...item.args, cwd: launcher.cwd};
  const label = commands.label(command, args);

  // Build the onclick handler.
  let onclick = () => {
    // If an item has already been launched,
    // don't try to launch another.
    if (launcher.pending === true) {
      return;
    }
    launcher.pending = true;
    commands.execute(command, {
      ...item.args,
      cwd: launcher.cwd
    }).then(value => {
      launcher.pending = false;
      if (value instanceof Widget) {
        launcherCallback(value);
        launcher.dispose();
      }
    }).catch(err => {
      launcher.pending = false;
      showErrorMessage('Launcher Error', err);
    });
  };

  // Return the VDOM element.
  return (
    <div className='jp-LauncherCard'
      title={label}
      onClick={onclick}
      data-category={item.category || 'Other'}
      key={Private.keyProperty.get(item)}>
      <div className='jp-LauncherCard-icon'>
          {(item.kernelIconUrl && kernel) &&
            <img src={item.kernelIconUrl} className='jp-Launcher-kernelIcon' />}
          {(!item.kernelIconUrl && !kernel) &&
            <div className={`${commands.iconClass(command, args)} jp-Launcher-icon`} />}
          {(!item.kernelIconUrl && kernel) &&
            <div className='jp-LauncherCard-noKernelIcon'>
              {label[0].toUpperCase()}
            </div>}
      </div>
      <div className='jp-LauncherCard-label' title={label}>
        {label}
      </div>
    </div>
  );
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * An incrementing counter for keys.
   */
  let id = 0;

  /**
   * An attached property for an item's key.
   */
  export
  const keyProperty = new AttachedProperty<ILauncher.IItemOptions, number>({
    name: 'key',
    create: () => id++
  });

  /**
   * Create a fully specified item given item options.
   */
  export
  function createItem(options: ILauncher.IItemOptions): ILauncher.IItemOptions {
    return {
      ...options,
      category: options.category || '',
      rank: options.rank !== undefined ? options.rank : Infinity
    };
  }

  /**
   * A sort comparison function for a launcher item.
   */
  export
  function sortCmp(a: ILauncher.IItemOptions, b: ILauncher.IItemOptions, cwd: string, commands: CommandRegistry): number {
    // First, compare by rank.
    let r1 = a.rank;
    let r2 = b.rank;
    if (r1 !== r2 && r1 !== undefined && r2 !== undefined) {
      return r1 < r2 ? -1 : 1;  // Infinity safe
    }

    // Finally, compare by display name.
    const aLabel = commands.label(a.command, { ...a.args, cwd });
    const bLabel = commands.label(a.command, { ...b.args, cwd });
    return aLabel.localeCompare(bLabel);
  }
}
