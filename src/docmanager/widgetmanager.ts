// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from '@phosphor/algorithm';

import {
  find
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  DisposableSet, IDisposable
} from '@phosphor/disposable';

import {
  IMessageHandler, Message, installMessageHook
} from '@phosphor/messaging';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  disconnectReceiver
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  dateTime
} from '../common/dates';

import {
  showDialog, cancelButton, warnButton
} from '../common/dialog';

import {
  DocumentRegistry
} from '../docregistry';


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
    this._registry = options.registry;
  }

  /**
   * Test whether the document widget manager is disposed.
   */
  get isDisposed(): boolean {
    return this._registry === null;
  }

  /**
   * Dispose of the resources used by the widget manager.
   */
  dispose(): void {
    if (this._registry == null) {
      return;
    }
    this._registry = null;
    disconnectReceiver(this);
  }

  /**
   * Create a widget for a document and handle its lifecycle.
   *
   * @param name - The name of the widget factory.
   *
   * @param context - The document context object.
   *
   * @returns A widget created by the factory.
   *
   * @throws If the factory is not registered.
   */
  createWidget(name: string, context: DocumentRegistry.Context): Widget {
    let factory = this._registry.getWidgetFactory(name);
    if (!factory) {
      throw new Error(`Factory is not registered: ${name}`);
    }
    let widget = factory.createNew(context);
    Private.nameProperty.set(widget, name);

    // Handle widget extensions.
    let disposables = new DisposableSet();
    each(this._registry.widgetExtensions(name), extender => {
      disposables.add(extender.createNew(widget, context));
    });
    Private.disposablesProperty.set(widget, disposables);
    widget.disposed.connect(this._onWidgetDisposed, this);

    this.adoptWidget(context, widget);
    context.fileChanged.connect(this._onFileChanged, this);
    context.pathChanged.connect(this._onPathChanged, this);
    context.ready.then(() => {
      this.setCaption(widget);
    });
    return widget;
  }

  /**
   * Install the message hook for the widget and add to list
   * of known widgets.
   *
   * @param context - The document context object.
   *
   * @param widget - The widget to adopt.
   */
  adoptWidget(context: DocumentRegistry.Context, widget: Widget): void {
    let widgets = Private.widgetsProperty.get(context);
    widgets.pushBack(widget);
    installMessageHook(widget, (handler: IMessageHandler, msg: Message) => {
      return this.filterMessage(handler, msg);
    });
    widget.addClass(DOCUMENT_CLASS);
    widget.title.closable = true;
    widget.disposed.connect(this._widgetDisposed, this);
    Private.contextProperty.set(widget, context);
  }

  /**
   * See if a widget already exists for the given context and widget name.
   *
   * @param context - The document context object.
   *
   * @returns The found widget, or `undefined`.
   *
   * #### Notes
   * This can be used to use an existing widget instead of opening
   * a new widget.
   */
  findWidget(context: DocumentRegistry.Context, widgetName: string): Widget {
    let widgets = Private.widgetsProperty.get(context);
    return find(widgets, widget => {
      let name = Private.nameProperty.get(widget);
      if (name === widgetName) {
        return true;
      }
    });
  }

  /**
   * Get the document context for a widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The context associated with the widget, or `undefined`.
   */
  contextForWidget(widget: Widget): DocumentRegistry.Context {
    return Private.contextProperty.get(widget);
  }

  /**
   * Clone a widget.
   *
   * @param widget - The source widget.
   *
   * @returns A new widget or `undefined`.
   *
   * #### Notes
   *  Uses the same widget factory and context as the source, or returns
   *  `undefined` if the source widget is not managed by this manager.
   */
  cloneWidget(widget: Widget): Widget {
    let context = Private.contextProperty.get(widget);
    if (!context) {
      return;
    }
    let name = Private.nameProperty.get(widget);
    let newWidget = this.createWidget(name, context);
    this.adoptWidget(context, newWidget);
    return widget;
  }

  /**
   * Close the widgets associated with a given context.
   *
   * @param context - The document context object.
   */
  closeWidgets(context: DocumentRegistry.Context): void {
    let widgets = Private.widgetsProperty.get(context);
    each(widgets, widget => {
      widget.close();
    });
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
   *
   * @param widget - The target widget.
   */
  protected setCaption(widget: Widget): void {
    let context = Private.contextProperty.get(widget);
    let model = context.contentsModel;
    if (!model) {
      widget.title.caption = '';
      return;
    }
    context.listCheckpoints().then(checkpoints => {
      if (widget.isDisposed) {
        return;
      }
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
   *
   * @param widget - The target widget.
   *
   * @returns A promise that resolves with whether the widget was closed.
   */
  protected onClose(widget: Widget): Promise<boolean> {
    // Handle dirty state.
    return this._maybeClose(widget).then(result => {
      if (widget.isDisposed) {
        return true;
      }
      if (result) {
        this._closeGuard = true;
        widget.close();
        this._closeGuard = false;
        // Dispose of document widgets when they are closed.
        widget.dispose();
      }
      return result;
    }).catch(() => {
      widget.dispose();
    });
  }

  /**
   * Ask the user whether to close an unsaved file.
   */
  private _maybeClose(widget: Widget): Promise<boolean> {
    // Bail if the model is not dirty or other widgets are using the model.
    let context = Private.contextProperty.get(widget);
    let widgets = Private.widgetsProperty.get(context);
    let model = context.model;
    if (!model.dirty || widgets.length > 1) {
      return Promise.resolve(true);
    }
    let fileName = widget.title.label;
    return showDialog({
      title: 'Close without saving?',
      body: `File "${fileName}" has unsaved changes, close without saving?`,
      buttons: [cancelButton, warnButton]
    }).then(value => {
      if (value && value.text === 'OK') {
        return true;
      }
      return false;
    });
  }

  /**
   * Handle the disposal of a widget.
   */
  private _widgetDisposed(widget: Widget): void {
    let context = Private.contextProperty.get(widget);
    let widgets = Private.widgetsProperty.get(context);
     // Remove the widget.
    widgets.remove(widget);
    // Dispose of the context if this is the last widget using it.
    if (!widgets.length) {
      context.dispose();
    }
  }

  /**
   * Handle the disposal of a widget.
   */
  private _onWidgetDisposed(widget: Widget): void {
    let disposables = Private.disposablesProperty.get(widget);
    disposables.dispose();
  }

  /**
   * Handle a file changed signal for a context.
   */
  private _onFileChanged(context: DocumentRegistry.Context): void {
    let widgets = Private.widgetsProperty.get(context);
    each(widgets, widget => { this.setCaption(widget); });
  }

  /**
   * Handle a path changed signal for a context.
   */
  private _onPathChanged(context: DocumentRegistry.Context): void {
    let widgets = Private.widgetsProperty.get(context);
    each(widgets, widget => { this.setCaption(widget); });
  }

  private _closeGuard = false;
  private _registry: DocumentRegistry = null;
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
    registry: DocumentRegistry;
  }
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * A private attached property for a widget context.
   */
  export
  const contextProperty = new AttachedProperty<Widget, DocumentRegistry.Context>({
    name: 'context'
  });

  /**
   * A private attached property for a widget factory name.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({
    name: 'name'
  });

  /**
   * A private attached property for the widgets associated with a context.
   */
  export
  const widgetsProperty = new AttachedProperty<DocumentRegistry.Context, Vector<Widget>>({
    name: 'widgets',
    create: () => {
      return new Vector<Widget>();
    }
  });

  /**
   * A private attached property for a widget's disposables.
   */
  export
  const disposablesProperty = new AttachedProperty<Widget, DisposableSet>({
    name: 'disposables'
  });
}
