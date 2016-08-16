// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  IKernel
} from 'jupyter-js-services';

import {
  MimeData as IClipboard
} from 'phosphor/lib/core/mimedata';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ABCWidgetFactory, IDocumentContext
} from '../../docregistry';

import {
  RenderMime
} from '../../rendermime';

import {
  ToolbarItems
} from '../notebook/default-toolbar';

import {
  INotebookModel
} from '../notebook/model';

import {
  NotebookPanel
} from '../notebook/panel';

import {
  NotebookWidgetFactory
} from '../notebook/widgetfactory';

import {
  IInspector
} from '../../inspector';

/**
 * A default widget factory for notebook panels.
 */
export
class DefaultNotebookWidgetFactory extends ABCWidgetFactory<NotebookPanel, INotebookModel> implements NotebookWidgetFactory {

  /**
   * Construct a new notebook widget factory.
   *
   * @param rendermime - The rendermime instance.
   *
   * @param clipboard - The application clipboard.
   *
   * @param renderer - The notebook panel renderer.
   * 
   * @param inspector - The inspector.
   */
  constructor(rendermime: RenderMime, clipboard: IClipboard, renderer: NotebookPanel.IRenderer, inspector: IInspector) {
    super();
    this._rendermime = rendermime;
    this._clipboard = clipboard;
    this._renderer = renderer;
    this._inspector = inspector;
    
    this._tracker = new FocusTracker<NotebookPanel>();
  }

  /**
   * Dispose of the resources used by the factory.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._rendermime = null;
    this._clipboard = null;
    this._renderer = null;
    this._tracker = null;
    super.dispose();
  }

  get tracker() {
    return this._tracker;
  }

  /**
   * Create a new widget.
   *
   * #### Notes
   * The factory will start the appropriate kernel and populate
   * the default toolbar items using `ToolbarItems.populateDefaults`.
   */
  createNew(context: IDocumentContext<INotebookModel>, kernel?: IKernel.IModel): NotebookPanel {
    let rendermime = this._rendermime.clone();
    if (kernel) {
      context.changeKernel(kernel);
    }
    let panel = new NotebookPanel({
      rendermime,
      clipboard: this._clipboard,
      renderer: this._renderer
    });
    panel.context = context;
    ToolbarItems.populateDefaults(panel);
    console.log(panel.content.childAt(0).editor);
    this.widgetCreated.emit(panel);

    const inspector = this._inspector;
    if (inspector) {
      // Set the source of the code inspector to the current notebook.
      panel.activated.connect(() => {
        inspector.source = panel.content.inspectionHandler;
      });
    }

    this.tracker.add(panel);
    return panel;
  }

  private _rendermime: RenderMime = null;
  private _clipboard: IClipboard = null;
  private _inspector: IInspector = null;
  private _renderer: NotebookPanel.IRenderer = null;
  private _tracker:FocusTracker<NotebookPanel> = null;
}
