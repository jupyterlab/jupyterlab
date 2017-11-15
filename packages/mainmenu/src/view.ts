// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, IMenuExtender, JupyterLabMenu, findExtender
} from './labmenu';

/**
 * An interface for a View menu.
 */
export
interface IViewMenu extends IJupyterLabMenu {
  /**
   * Add an IKernelUser to the Kernel menu.
   *
   * @param user - An IKernelUser.
   */
  addEditorViewer<T extends Widget>(user: IViewMenu.IEditorViewer<T>): void;
}

/**
 * An extensible View menu for the application.
 */
export
class ViewMenu extends JupyterLabMenu implements IViewMenu {
  /**
   * Construct the view menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'View';
  }

  /**
   * Add a new KernelUser to the menu.
   *
   * @param user - the user to add.
   */
  addEditorViewer<T extends Widget>(editorViewer: IViewMenu.IEditorViewer<T>): void {
    this._editorViewers.push(editorViewer);
  }

  /**
   * Find a kernel user for a given widget.
   *
   * @param widget - A widget to check.
   *
   * @returns an IKernelUser if any of the registered users own the widget.
   *   Otherwise it returns undefined.
   */
  findEditorViewer(widget: Widget | null): IViewMenu.IEditorViewer<Widget> | undefined {
    return findExtender<Widget>(widget, this._editorViewers);
  }

  private _editorViewers: IViewMenu.IEditorViewer<Widget>[] = [];
}

/**
 * Namespace for IViewMenu.
 */
export
namespace IViewMenu {
  /**
   * Interface for a text editor viewer to register
   * itself with the text editor extension points.
   */
  export
  interface IEditorViewer<T extends Widget> extends IMenuExtender<T> {
    /**
     * Whether to show line numbers in the editor.
     */
    toggleLineNumbers?: (widget: T) => void;

    /**
     * Whether to word-wrap the editor.
     */
    toggleWordWrap?: (widget: T) => void;

    /**
     * Whether to match brackets in the editor.
     */
    toggleMatchBrackets?: (widget: T) => void;

    /**
     * Whether line numbers are toggled.
     */
    lineNumbersToggled?: (widget: T) => boolean;
    /**
     * Whether word wrap is toggled.
     */
    wordWrapToggled?: (widget: T) => boolean;
    /**
     * Whether match brackets is toggled.
     */
    matchBracketsToggled?: (widget: T) => boolean;
  }
}
