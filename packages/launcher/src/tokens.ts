/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator } from '@jupyterlab/translation';
import { VDomRenderer } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyJSONObject, Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';

/**
 * The launcher token.
 */
export const ILauncher = new Token<ILauncher>(
  '@jupyterlab/launcher:ILauncher',
  `A service for the application activity launcher.
  Use this to add your extension activities to the launcher panel.`
);

/**
 * The launcher interface.
 */
export interface ILauncher {
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
 * The namespace for `ILauncher` class statics.
 */
export namespace ILauncher {
  /**
   * An interface for the launcher model
   */
  export interface IModel extends ILauncher, VDomRenderer.IModel {
    /**
     * Return an iterator of launcher items.
     */
    items(): IterableIterator<ILauncher.IItemOptions>;
  }

  /**
   * The options used to create a Launcher.
   */
  export interface IOptions {
    /**
     * The model of the launcher.
     */
    model: IModel;

    /**
     * The cwd of the launcher.
     */
    cwd: string;

    /**
     * The command registry used by the launcher.
     */
    commands: CommandRegistry;

    /**
     * The application language translation.
     */
    translator?: ITranslator;

    /**
     * The callback used when an item is launched.
     */
    callback: (widget: Widget) => void;
  }

  /**
   * The options used to create a launcher item.
   */
  export interface IItemOptions {
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
     * The default value is an empty string.
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

    /**
     * Metadata about the item.  This can be used by the launcher to
     * affect how the item is displayed.
     */
    metadata?: ReadonlyJSONObject;
  }
}
