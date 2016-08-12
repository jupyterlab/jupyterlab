// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  DisposableSet, IDisposable
} from 'phosphor/lib/core/disposable';

import {
  IMessageHandler, Message, installMessageHook
} from 'phosphor/lib/core/messaging';

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  clearSignalData
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  dateTime
} from '../common/dates';

import {
  showDialog
} from '../dialog';

import {
  IDocumentRegistry, IDocumentContext, IDocumentModel
} from '../docregistry';

import {
  ContextManager
} from './context';


/**
 * The class name added to document widgets.
 */
const DOCUMENT_CLASS = 'jp-Document';


/**
 * A class that maintains the lifecyle of file-backed widgets.
 */
export
class DocumentWidgetManager implements IDisposable {
  /**
   * Construct a new document widget manager.
   */
  constructor(options: DocumentWidgetManager.IOptions) {
    this._contextManager = options.contextManager;
    this._registry = options.registry;
  }

  /**
   * Test whether the context has been disposed (read-only).
   */
  get isDisposed(): boolean {
    return this._registry === null;
  }

  /**
   * Dispose of the resources used by the widget manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._registry = null;
    this._contextManager = null;
    for (let id in this._widgets) {
      for (let widget of this._widgets[id]) {
        widget.dispose();
      }
    }
    clearSignalData(this);
  }

  /**
   * Create a widget for a document and handle its lifecycle.
   */
  createWidget(name: string, id: string, kernel?: IKernel.IModel): Widget {
    let factory = this._registry.getWidgetFactory(name);
    let context = this._contextManager.getContext(id);
    let widget = factory.createNew(context, kernel);
    Private.nameProperty.set(widget, name);

    // Handle widget extensions.
    let disposables = new DisposableSet();
    for (let extender of this._registry.getWidgetExtensions(name)) {
      disposables.add(extender.createNew(widget, context));
    }
    widget.disposed.connect(() => {
      disposables.dispose();
    });
    this.adoptWidget(id, widget);
    this.setCaption(widget);
    context.contentsModelChanged.connect(() => {
      this.setCaption(widget);
    });
    context.populated.connect(() => {
      this.setCaption(widget);
    });
    return widget;
  }

  /**
   * Install the message hook for the widget and add to list
   * of known widgets.
   */
  adoptWidget(id: string, widget: Widget): void {
    if (!(id in this._widgets)) {
      this._widgets[id] = [];
    }
    this._widgets[id].push(widget);
    installMessageHook(widget, (handler: IMessageHandler, msg: Message) => {
      return this.filterMessage(handler, msg);
    });
    widget.addClass(DOCUMENT_CLASS);
    widget.title.closable = true;
    widget.disposed.connect(() => {
      // Remove the widget from the widget registry.
      let index = this._widgets[id].indexOf(widget);
      this._widgets[id].splice(index, 1);
      // Dispose of the context if this is the last widget using it.
      if (!this._widgets[id].length) {
        let context = this._contextManager.getContext(id);
        context.dispose();
      }
    });
    Private.idProperty.set(widget, id);
  }

  /**
   * See if a widget already exists for the given path and widget name.
   *
   * #### Notes
   * This can be used to use an existing widget instead of opening
   * a new widget.
   */
  findWidget(path: string, widgetName: string): Widget {
    let ids = this._contextManager.getIdsForPath(path);
    for (let id of ids) {
      for (let widget of this._widgets[id]) {
        let name = Private.nameProperty.get(widget);
        if (name === widgetName) {
          return widget;
        }
      }
    }
  }

  /**
   * Get the document context for a widget.
   */
  contextForWidget(widget: Widget): IDocumentContext<IDocumentModel> {
    let id = Private.idProperty.get(widget);
    return this._contextManager.getContext(id);
  }

  /**
   * Clone a widget.
   *
   * #### Notes
   * This will create a new widget with the same model and context
   * as this widget.
   */
  clone(widget: Widget): Widget {
    let id = Private.idProperty.get(widget);
    let name = Private.nameProperty.get(widget);
    let newWidget = this.createWidget(name, id);
    this.adoptWidget(id, newWidget);
    return widget;
  }

  /**
   * Close the widgets associated with a given path.
   */
  closeFile(path: string): void {
    let ids = this._contextManager.getIdsForPath(path);
    for (let id of ids) {
      let widgets: Widget[] = this._widgets[id] || [];
      for (let w of widgets) {
        w.close();
      }
    }
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {
    for (let id in this._widgets) {
      for (let w of this._widgets[id]) {
        w.close();
      }
    }
  }

  /**
   * Filter a message sent to a message handler.
   *
   * @param handler - The target handler of the message.
   *
   * @param msg - The message dispatched to the handler.
   *
   * @returns `false` if the message should be filtered, of `true`
   *   if the message should be dispatched to the handler as normal.
   */
  protected filterMessage(handler: IMessageHandler, msg: Message): boolean {
    if (msg.type === 'close-request') {
      if (this._closeGuard) {
        return true;
      }
      this.onClose(handler as Widget);
      return false;
    }
    return true;
  }

  /**
   * Set the caption for widget title.
   */
  protected setCaption(widget: Widget): void {
    let context = this.contextForWidget(widget);
    let model = context.contentsModel;
    if (!model) {
      widget.title.caption = '';
      return;
    }
    context.listCheckpoints().then(checkpoints => {
      let last = checkpoints[checkpoints.length - 1];
      let checkpoint = last ? dateTime(last.last_modified) : 'None';
      widget.title.caption = (
        `Name: ${model.name}\n` +
        `Path: ${model.path}\n` +
        `Last Saved: ${dateTime(model.last_modified)}\n` +
        `Last Checkpoint: ${checkpoint}`
      );
    });
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onClose(widget: Widget): void {
    // Handle dirty state.
    this._maybeClose(widget).then(result => {
      if (result) {
        this._closeGuard = true;
        widget.close();
        this._closeGuard = false;
        // Dispose of document widgets when they are closed.
        widget.dispose();
      }
    }).catch(() => {
      widget.dispose();
    });
  }

  /**
   * Ask the user whether to close an unsaved file.
   */
  private _maybeClose(widget: Widget): Promise<boolean> {
    // Bail if the model is not dirty or other widgets are using the model.
    let id = Private.idProperty.get(widget);
    let widgets = this._widgets[id];
    let model = this._contextManager.getModel(id);
    if (!model.dirty || widgets.length > 1) {
      return Promise.resolve(true);
    }
    let fileName = widget.title.label;
    return showDialog({
      title: 'Close without saving?',
      body: `File "${fileName}" has unsaved changes, close without saving?`
    }).then(value => {
      if (value && value.text === 'OK') {
        return true;
      }
      return false;
    });
  }

  private _closeGuard = false;
  private _contextManager: ContextManager = null;
  private _registry: IDocumentRegistry = null;
  private _widgets: { [key: string]: Widget[] } = Object.create(null);
}


/**
 * A namespace for document widget manager statics.
 */
export
namespace DocumentWidgetManager {
  /**
   * The options used to initialize a document widget manager.
   */
  export
  interface IOptions {
    /**
     * A document registry instance.
     */
    registry: IDocumentRegistry;

    /**
     * A context manager instance.
     */
    contextManager: ContextManager;
  }
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * A private attached property for a widget context id.
   */
  export
  const idProperty = new AttachedProperty<Widget, string>({
    name: 'id'
  });

  /**
   * A private attached property for a widget factory name.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({
    name: 'name'
  });
}
