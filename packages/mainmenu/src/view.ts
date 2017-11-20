// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, IMenuExtender, JupyterLabMenu
} from './labmenu';

/**
 * An interface for a View menu.
 */
export
interface IViewMenu extends IJupyterLabMenu {
  /**
   * A map storing IKernelUsers for the Kernel menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly editorViewers: Map<string, IViewMenu.IEditorViewer<Widget>>;
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

    this.editorViewers =
      new Map<string, IViewMenu.IEditorViewer<Widget>>();
  }

  /**
   * A map storing IKernelUsers for the Kernel menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly editorViewers: Map<string, IViewMenu.IEditorViewer<Widget>>;
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
