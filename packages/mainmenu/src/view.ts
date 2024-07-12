// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { SemanticCommand } from '@jupyterlab/apputils';

/**
 * An interface for a View menu.
 */
export interface IViewMenu extends IRankedMenu {
  /**
   * Semantic commands IEditorViewer for the View menu.
   */
  readonly editorViewers: IViewMenu.IEditorViewer;
}

/**
 * An extensible View menu for the application.
 */
export class ViewMenu extends RankedMenu implements IViewMenu {
  /**
   * Construct the view menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this.editorViewers = {
      toggleLineNumbers: new SemanticCommand(),
      toggleMatchBrackets: new SemanticCommand(),
      toggleWordWrap: new SemanticCommand()
    };
  }

  /**
   * Semantic commands IEditorViewer for the View menu.
   */
  readonly editorViewers: IViewMenu.IEditorViewer;
}

/**
 * Namespace for IViewMenu.
 */
export namespace IViewMenu {
  /**
   * Interface for a text editor viewer to register
   * itself with the text editor semantic commands.
   */
  export interface IEditorViewer {
    /**
     * A semantic command to show line numbers in the editor.
     */
    toggleLineNumbers: SemanticCommand;

    /**
     * A semantic command to word-wrap the editor.
     */
    toggleWordWrap: SemanticCommand;

    /**
     * A semantic command to match brackets in the editor.
     */
    toggleMatchBrackets: SemanticCommand;
  }
}
