// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IEditorView
} from './view';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

export *  from './view';

/**
 * An editor widget.
 */
export
interface EditorWidget extends Widget, IEditorView {
}

/**
 * Utilities for an editor widget.
 */
export
namespace EditorWidget {

  /**
   * Tests whether the given widget is an editor widget.
   */
  export
  function is(widget:Widget): widget is EditorWidget {
    return IEditorView.is(widget);
  }

  /**
   * A class that tracks editor widgets.
   */
  export
  interface Tracker extends FocusTracker<EditorWidget> { }

  /* tslint:disable */
  /**
   * The editor tracker token.
   */
  export
  const Tracker = new Token<Tracker>('jupyter.services.editor-tracker');
  /* tslint:enable */

  /*
   * An editor widget factory. 
   */
  export
  abstract class Factory extends ABCWidgetFactory<EditorWidget, IDocumentModel> {
    /**
     * An editor tracker for editors created by this factory.
     */
    tracker: Tracker
    /**
     * Registers commands for editors created by this factory. 
     */
    abstract registerCommands(category?: string): void;
    /**
     * Registers menu items for editors created by this factory.
     */
    abstract registerMenuItems(menu: Menu): void;
  }

  /* tslint:disable */
  /**
   * The editow widget factory token.
   */
  export
  const IFactory = new Token<Factory>('jupyter.services.editor.factory');
  /* tslint:enable */

}