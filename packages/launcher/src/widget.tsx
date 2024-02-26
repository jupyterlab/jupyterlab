// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  classes,
  LabIcon,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import { ArrayExt, map } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { AttachedProperty } from '@lumino/properties';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { ILauncher } from './tokens';

/**
 * The class name added to Launcher instances.
 */
const LAUNCHER_CLASS = 'jp-Launcher';

/**
 * LauncherModel keeps track of the path to working directory and has a list of
 * LauncherItems, which the Launcher will render.
 */
export class LauncherModel extends VDomModel implements ILauncher.IModel {
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
    const item = Private.createItem(options);

    this.itemsList.push(item);
    this.stateChanged.emit(void 0);

    return new DisposableDelegate(() => {
      ArrayExt.removeFirstOf(this.itemsList, item);
      this.stateChanged.emit(void 0);
    });
  }

  /**
   * Return an iterator of launcher items.
   */
  items(): IterableIterator<ILauncher.IItemOptions> {
    return this.itemsList[Symbol.iterator]();
  }

  protected itemsList: ILauncher.IItemOptions[] = [];
}

/**
 * A virtual-DOM-based widget for the Launcher.
 */
export class Launcher extends VDomRenderer<ILauncher.IModel> {
  /**
   * Construct a new launcher widget.
   */
  constructor(options: ILauncher.IOptions) {
    super(options.model);
    this._cwd = options.cwd;
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
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
  protected render(): React.ReactElement<any> | null {
    // Bail if there is no model.
    if (!this.model) {
      return null;
    }

    const knownCategories = [
      this._trans.__('Notebook'),
      this._trans.__('Console'),
      this._trans.__('Other')
    ];
    const kernelCategories = [
      this._trans.__('Notebook'),
      this._trans.__('Console')
    ];

    // First group-by categories
    const categories = Object.create(null);
    for (const item of this.model.items()) {
      const cat = item.category || this._trans.__('Other');
      if (!(cat in categories)) {
        categories[cat] = [];
      }
      categories[cat].push(item);
    }
    // Within each category sort by rank
    for (const cat in categories) {
      categories[cat] = categories[cat].sort(
        (a: ILauncher.IItemOptions, b: ILauncher.IItemOptions) => {
          return Private.sortCmp(a, b, this._cwd, this._commands);
        }
      );
    }

    // Variable to help create sections
    const sections: React.ReactElement<any>[] = [];
    let section: React.ReactElement<any>;

    // Assemble the final ordered list of categories, beginning with
    // KNOWN_CATEGORIES.
    const orderedCategories: string[] = [];
    for (const cat of knownCategories) {
      orderedCategories.push(cat);
    }
    for (const cat in categories) {
      if (knownCategories.indexOf(cat) === -1) {
        orderedCategories.push(cat);
      }
    }

    // Now create the sections for each category
    orderedCategories.forEach(cat => {
      if (!categories[cat]) {
        return;
      }
      const item = categories[cat][0] as ILauncher.IItemOptions;
      const args = { ...item.args, cwd: this.cwd };
      const kernel = kernelCategories.indexOf(cat) > -1;
      const iconClass = this._commands.iconClass(item.command, args);
      const icon = this._commands.icon(item.command, args);

      if (cat in categories) {
        section = (
          <div className="jp-Launcher-section" key={cat}>
            <div className="jp-Launcher-sectionHeader">
              <LabIcon.resolveReact
                icon={icon}
                iconClass={classes(iconClass, 'jp-Icon-cover')}
                stylesheet="launcherSection"
                aria-hidden="true"
              />
              <h2 className="jp-Launcher-sectionTitle">{cat}</h2>
            </div>
            <div className="jp-Launcher-cardContainer">
              {Array.from(
                map(categories[cat], (item: ILauncher.IItemOptions) => {
                  return Card(
                    kernel,
                    item,
                    this,
                    this._commands,
                    this._trans,
                    this._callback
                  );
                })
              )}
            </div>
          </div>
        );
        sections.push(section);
      }
    });

    // Wrap the sections in body and content divs.
    return (
      <div className="jp-Launcher-body">
        <div className="jp-Launcher-content">
          <div className="jp-Launcher-cwd">
            <h3>{this.cwd}</h3>
          </div>
          {sections}
        </div>
      </div>
    );
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _commands: CommandRegistry;
  private _callback: (widget: Widget) => void;
  private _pending = false;
  private _cwd = '';
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
 * @param commands - the command registry holding the command of item.
 *
 * @param trans - the translation bundle.
 *
 * @returns a vdom `VirtualElement` for the launcher card.
 */
function Card(
  kernel: boolean,
  item: ILauncher.IItemOptions,
  launcher: Launcher,
  commands: CommandRegistry,
  trans: TranslationBundle,
  launcherCallback: (widget: Widget) => void
): React.ReactElement<any> {
  // Get some properties of the command
  const command = item.command;
  const args = { ...item.args, cwd: launcher.cwd };
  const caption = commands.caption(command, args);
  const label = commands.label(command, args);
  const title = kernel ? label : caption || label;

  // Build the onclick handler.
  const onclick = () => {
    // If an item has already been launched,
    // don't try to launch another.
    if (launcher.pending === true) {
      return;
    }
    launcher.pending = true;
    void commands
      .execute(command, {
        ...item.args,
        cwd: launcher.cwd
      })
      .then(value => {
        launcher.pending = false;
        if (value instanceof Widget) {
          launcherCallback(value);
        }
      })
      .catch(err => {
        console.error(err);
        launcher.pending = false;
        void showErrorMessage(trans._p('Error', 'Launcher Error'), err);
      });
  };

  // With tabindex working, you can now pick a kernel by tabbing around and
  // pressing Enter.
  const onkeypress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onclick();
    }
  };

  const iconClass = commands.iconClass(command, args);
  const icon = commands.icon(command, args);

  // Return the VDOM element.
  return (
    <div
      className="jp-LauncherCard"
      title={title}
      onClick={onclick}
      onKeyPress={onkeypress}
      tabIndex={0}
      data-category={item.category || trans.__('Other')}
      key={Private.keyProperty.get(item)}
    >
      <div className="jp-LauncherCard-icon">
        {kernel ? (
          item.kernelIconUrl ? (
            <img
              src={item.kernelIconUrl}
              className="jp-Launcher-kernelIcon"
              alt={title}
            />
          ) : (
            <div className="jp-LauncherCard-noKernelIcon">
              {label[0].toUpperCase()}
            </div>
          )
        ) : (
          <LabIcon.resolveReact
            icon={icon}
            iconClass={classes(iconClass, 'jp-Icon-cover')}
            stylesheet="launcherCard"
          />
        )}
      </div>
      <div className="jp-LauncherCard-label" title={title}>
        <p>{label}</p>
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
  export const keyProperty = new AttachedProperty<
    ILauncher.IItemOptions,
    number
  >({
    name: 'key',
    create: () => id++
  });

  /**
   * Create a fully specified item given item options.
   */
  export function createItem(
    options: ILauncher.IItemOptions
  ): ILauncher.IItemOptions {
    return {
      ...options,
      category: options.category || '',
      rank: options.rank !== undefined ? options.rank : Infinity
    };
  }

  /**
   * A sort comparison function for a launcher item.
   */
  export function sortCmp(
    a: ILauncher.IItemOptions,
    b: ILauncher.IItemOptions,
    cwd: string,
    commands: CommandRegistry
  ): number {
    // First, compare by rank.
    const r1 = a.rank;
    const r2 = b.rank;
    if (r1 !== r2 && r1 !== undefined && r2 !== undefined) {
      return r1 < r2 ? -1 : 1; // Infinity safe
    }

    // Finally, compare by display name.
    const aLabel = commands.label(a.command, { ...a.args, cwd });
    const bLabel = commands.label(b.command, { ...b.args, cwd });
    return aLabel.localeCompare(bLabel);
  }
}
