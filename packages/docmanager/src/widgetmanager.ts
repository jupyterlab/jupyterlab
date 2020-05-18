// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt, each, map, find, filter, toArray } from '@lumino/algorithm';

import { DisposableSet, IDisposable } from '@lumino/disposable';

import { IMessageHandler, Message, MessageLoop } from '@lumino/messaging';

import { AttachedProperty } from '@lumino/properties';

import { ISignal, Signal } from '@lumino/signaling';

import { Widget } from '@lumino/widgets';

import { Time } from '@jupyterlab/coreutils';

import { showDialog, Dialog } from '@jupyterlab/apputils';

import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';

import { Contents } from '@jupyterlab/services';

/**
 * The class name added to document widgets.
 */
const DOCUMENT_CLASS = 'jp-Document';

/**
 * A class that maintains the lifecycle of file-backed widgets.
 */
export class DocumentWidgetManager implements IDisposable {
  /**
   * Construct a new document widget manager.
   */
  constructor(options: DocumentWidgetManager.IOptions) {
    this._registry = options.registry;
  }

  /**
   * A signal emitted when one of the documents is activated.
   */
  get activateRequested(): ISignal<this, string> {
    return this._activateRequested;
  }

  /**
   * Test whether the document widget manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the widget manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.disconnectReceiver(this);
  }

  /**
   * Create a widget for a document and handle its lifecycle.
   *
   * @param factory - The widget factory.
   *
   * @param context - The document context object.
   *
   * @returns A widget created by the factory.
   *
   * @throws If the factory is not registered.
   */
  createWidget(
    factory: DocumentRegistry.WidgetFactory,
    context: DocumentRegistry.Context
  ): IDocumentWidget {
    const widget = factory.createNew(context);
    this._initializeWidget(widget, factory, context);
    return widget;
  }

  /**
   * When a new widget is created, we need to hook it up
   * with some signals, update the widget extensions (for
   * this kind of widget) in the docregistry, among
   * other things.
   */
  private _initializeWidget(
    widget: IDocumentWidget,
    factory: DocumentRegistry.WidgetFactory,
    context: DocumentRegistry.Context
  ) {
    Private.factoryProperty.set(widget, factory);
    // Handle widget extensions.
    const disposables = new DisposableSet();
    each(this._registry.widgetExtensions(factory.name), extender => {
      disposables.add(extender.createNew(widget, context));
    });
    Private.disposablesProperty.set(widget, disposables);
    widget.disposed.connect(this._onWidgetDisposed, this);

    this.adoptWidget(context, widget);
    context.fileChanged.connect(this._onFileChanged, this);
    context.pathChanged.connect(this._onPathChanged, this);
    void context.ready.then(() => {
      void this.setCaption(widget);
    });
  }

  /**
   * Install the message hook for the widget and add to list
   * of known widgets.
   *
   * @param context - The document context object.
   *
   * @param widget - The widget to adopt.
   */
  adoptWidget(
    context: DocumentRegistry.Context,
    widget: IDocumentWidget
  ): void {
    const widgets = Private.widgetsProperty.get(context);
    widgets.push(widget);
    MessageLoop.installMessageHook(widget, this);
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
  findWidget(
    context: DocumentRegistry.Context,
    widgetName: string
  ): IDocumentWidget | undefined {
    const widgets = Private.widgetsProperty.get(context);
    if (!widgets) {
      return undefined;
    }
    return find(widgets, widget => {
      const factory = Private.factoryProperty.get(widget);
      if (!factory) {
        return false;
      }
      return factory.name === widgetName;
    });
  }

  /**
   * Get the document context for a widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The context associated with the widget, or `undefined`.
   */
  contextForWidget(widget: Widget): DocumentRegistry.Context | undefined {
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
   *  Uses the same widget factory and context as the source, or throws
   *  if the source widget is not managed by this manager.
   */
  cloneWidget(widget: Widget): IDocumentWidget | undefined {
    const context = Private.contextProperty.get(widget);
    if (!context) {
      return undefined;
    }
    const factory = Private.factoryProperty.get(widget);
    if (!factory) {
      return undefined;
    }
    const newWidget = factory.createNew(context, widget as IDocumentWidget);
    this._initializeWidget(newWidget, factory, context);
    return newWidget;
  }

  /**
   * Close the widgets associated with a given context.
   *
   * @param context - The document context object.
   */
  closeWidgets(context: DocumentRegistry.Context): Promise<void> {
    const widgets = Private.widgetsProperty.get(context);
    return Promise.all(
      toArray(map(widgets, widget => this.onClose(widget)))
    ).then(() => undefined);
  }

  /**
   * Dispose of the widgets associated with a given context
   * regardless of the widget's dirty state.
   *
   * @param context - The document context object.
   */
  deleteWidgets(context: DocumentRegistry.Context): Promise<void> {
    const widgets = Private.widgetsProperty.get(context);
    return Promise.all(
      toArray(map(widgets, widget => this.onDelete(widget)))
    ).then(() => undefined);
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
  messageHook(handler: IMessageHandler, msg: Message): boolean {
    switch (msg.type) {
      case 'close-request':
        void this.onClose(handler as Widget);
        return false;
      case 'activate-request':
        const context = this.contextForWidget(handler as Widget);
        if (context) {
          this._activateRequested.emit(context.path);
        }
        break;
      default:
        break;
    }
    return true;
  }

  /**
   * Set the caption for widget title.
   *
   * @param widget - The target widget.
   */
  protected async setCaption(widget: Widget): Promise<void> {
    const context = Private.contextProperty.get(widget);
    if (!context) {
      return;
    }
    const model = context.contentsModel;
    if (!model) {
      widget.title.caption = '';
      return;
    }
    return context
      .listCheckpoints()
      .then((checkpoints: Contents.ICheckpointModel[]) => {
        if (widget.isDisposed) {
          return;
        }
        const last = checkpoints[checkpoints.length - 1];
        const checkpoint = last ? Time.format(last.last_modified) : 'None';
        let caption = `Name: ${model!.name}\nPath: ${model!.path}\n`;
        if (context!.model.readOnly) {
          caption += 'Read-only';
        } else {
          caption +=
            `Last Saved: ${Time.format(model!.last_modified)}\n` +
            `Last Checkpoint: ${checkpoint}`;
        }
        widget.title.caption = caption;
      });
  }

  /**
   * Handle `'close-request'` messages.
   *
   * @param widget - The target widget.
   *
   * @returns A promise that resolves with whether the widget was closed.
   */
  protected async onClose(widget: Widget): Promise<boolean> {
    // Handle dirty state.
    const [shouldClose, ignoreSave] = await this._maybeClose(widget);
    if (widget.isDisposed) {
      return true;
    }
    if (shouldClose) {
      if (!ignoreSave) {
        const context = Private.contextProperty.get(widget);
        if (!context) {
          return true;
        }
        if (context.contentsModel?.writable) {
          await context.save();
        } else {
          await context.saveAs();
        }
      }
      if (widget.isDisposed) {
        return true;
      }
      widget.dispose();
    }
    return shouldClose;
  }

  /**
   * Dispose of widget regardless of widget's dirty state.
   *
   * @param widget - The target widget.
   */
  protected onDelete(widget: Widget): Promise<void> {
    widget.dispose();
    return Promise.resolve(void 0);
  }

  /**
   * Ask the user whether to close an unsaved file.
   */
  private _maybeClose(widget: Widget): Promise<[boolean, boolean]> {
    // Bail if the model is not dirty or other widgets are using the model.)
    const context = Private.contextProperty.get(widget);
    if (!context) {
      return Promise.resolve([true, true]);
    }
    let widgets = Private.widgetsProperty.get(context);
    if (!widgets) {
      return Promise.resolve([true, true]);
    }
    // Filter by whether the factories are read only.
    widgets = toArray(
      filter(widgets, widget => {
        const factory = Private.factoryProperty.get(widget);
        if (!factory) {
          return false;
        }
        return factory.readOnly === false;
      })
    );
    const factory = Private.factoryProperty.get(widget);
    if (!factory) {
      return Promise.resolve([true, true]);
    }
    const model = context.model;
    if (!model.dirty || widgets.length > 1 || factory.readOnly) {
      return Promise.resolve([true, true]);
    }
    const fileName = widget.title.label;
    const saveLabel = context.contentsModel?.writable ? 'Save' : 'Save as';
    return showDialog({
      title: 'Save your work',
      body: `Save changes in "${fileName}" before closing?`,
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: 'Discard' }),
        Dialog.okButton({ label: saveLabel })
      ]
    }).then(result => {
      return [result.button.accept, result.button.displayType === 'warn'];
    });
  }

  /**
   * Handle the disposal of a widget.
   */
  private _widgetDisposed(widget: Widget): void {
    const context = Private.contextProperty.get(widget);
    if (!context) {
      return;
    }
    const widgets = Private.widgetsProperty.get(context);
    if (!widgets) {
      return;
    }
    // Remove the widget.
    ArrayExt.removeFirstOf(widgets, widget);
    // Dispose of the context if this is the last widget using it.
    if (!widgets.length) {
      context.dispose();
    }
  }

  /**
   * Handle the disposal of a widget.
   */
  private _onWidgetDisposed(widget: Widget): void {
    const disposables = Private.disposablesProperty.get(widget);
    disposables.dispose();
  }

  /**
   * Handle a file changed signal for a context.
   */
  private _onFileChanged(context: DocumentRegistry.Context): void {
    const widgets = Private.widgetsProperty.get(context);
    each(widgets, widget => {
      void this.setCaption(widget);
    });
  }

  /**
   * Handle a path changed signal for a context.
   */
  private _onPathChanged(context: DocumentRegistry.Context): void {
    const widgets = Private.widgetsProperty.get(context);
    each(widgets, widget => {
      void this.setCaption(widget);
    });
  }

  private _registry: DocumentRegistry;
  private _activateRequested = new Signal<this, string>(this);
  private _isDisposed = false;
}

/**
 * A namespace for document widget manager statics.
 */
export namespace DocumentWidgetManager {
  /**
   * The options used to initialize a document widget manager.
   */
  export interface IOptions {
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
  export const contextProperty = new AttachedProperty<
    Widget,
    DocumentRegistry.Context | undefined
  >({
    name: 'context',
    create: () => undefined
  });

  /**
   * A private attached property for a widget factory.
   */
  export const factoryProperty = new AttachedProperty<
    Widget,
    DocumentRegistry.WidgetFactory | undefined
  >({
    name: 'factory',
    create: () => undefined
  });

  /**
   * A private attached property for the widgets associated with a context.
   */
  export const widgetsProperty = new AttachedProperty<
    DocumentRegistry.Context,
    IDocumentWidget[]
  >({
    name: 'widgets',
    create: () => []
  });

  /**
   * A private attached property for a widget's disposables.
   */
  export const disposablesProperty = new AttachedProperty<
    Widget,
    DisposableSet
  >({
    name: 'disposables',
    create: () => new DisposableSet()
  });
}
