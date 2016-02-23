// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import {
  IContentsModel, IContentsManager, IContentsOpts
} from 'jupyter-js-services';

import * as arrays
  from 'phosphor-arrays';

import {
  IMessageFilter, IMessageHandler, Message, installMessageFilter,
  removeMessageFilter
} from 'phosphor-messaging';

import {
  Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget, Title
} from 'phosphor-widget';

import {
  JupyterCodeMirrorWidget as CodeMirrorWidget
} from './widget';

import {
  loadModeByFileName
} from './utils';


/**
 * The class name added to a dirty documents.
 */
const DIRTY_CLASS = 'jp-mod-dirty';


/**
 * An implementation of a file handler.
 */
export
abstract class AbstractFileHandler<T extends Widget> implements IMessageFilter {

  /**
   * Construct a new source file handler.
   */
  constructor(manager: IContentsManager) {
    this._manager = manager;
    document.addEventListener('focus', this._onFocus, true);
  }

  /**
   * Get the list of file extensions explicitly supported by the handler.
   */
  get fileExtensions(): string[] {
    return []
  }

  /**
   * Get the list of mime types explicitly supported by the handler.
   */
  get mimeTypes(): string[] {
    return []
  }

  /**
   * Get the contents manager used by the handler.
   *
   * #### Notes
   * This is a read-only property
   */
  get manager(): IContentsManager {
    return this._manager;
  }

  /**
   * Get the active widget.
   *
   * #### Notes
   * This is a read-only property.  It will be `null` if there is no
   * active widget.
   */
  get activeWidget(): T {
    return this._activeWidget;
  }

  /**
   * A signal emitted when the file handler has finished loading the
   * contents of the widget.
   */
  get finished(): ISignal<AbstractFileHandler<T>, IContentsModel> {
    return Private.finishedSignal.bind(this);
  }

  /**
   * A signal emitted when the file handler is activated.
   */
  get activated(): ISignal<AbstractFileHandler<T>, void> {
    return Private.activatedSignal.bind(this);
  }

  /**
   * Deactivate the handler.
   */
  deactivate(): void {
    this._activeWidget = null;
  }

  /**
   * Get the number of widgets managed by the handler.
   *
   * @returns The number of widgets managed by the handler.
   */
  widgetCount(): number {
    return this._widgets.length;
  }

  /**
   * Get the widget at the specified index.
   *
   * @param index - The index of the widget of interest.
   *
   * @returns The widget at the specified index, or `undefined`.
   */
  widgetAt(index: number): T {
    return this._widgets[index];
  }

  /**
   * Open a contents model and return a widget.
   */
  open(model: IContentsModel): T {
    let widget = this.findWidgetByModel(model);
    if (!widget) {
      widget = this.createWidget(model);
      widget.title.closable = true;
      this._setModel(widget, model);
      this._widgets.push(widget);
      installMessageFilter(widget, this);
    }

    // Fetch the contents and populate the widget asynchronously.
    let opts = this.getFetchOptions(model);
    this.manager.get(model.path, opts).then(contents => {
      widget.title.text = this.getTitleText(model);
      return this.populateWidget(widget, contents);
    }).then(() => {
      this.clearDirty(widget);
      this.finished.emit(model);
    });
    return widget;
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath: string): void {
    for (let w of this._widgets) {
      let model = this._getModel(w);
      if (model.path === oldPath) {
        this._setModel(w, model);
        w.title.text = this.getTitleText(model);
        return;
      }
    }
  }

  /**
   * Save widget contents.
   *
   * @param widget - The widget to save (defaults to current active widget).
   *
   * returns A promise that resolves to the contents of the widget.
   *
   * #### Notes
   * This clears the dirty state of the widget after a successful save.
   */
  save(widget?: T): Promise<IContentsModel> {
    widget = this.resolveWidget(widget);
    if (!widget) {
      return Promise.resolve(void 0);
    }
    let model = this._getModel(widget);
    return this.getSaveOptions(widget, model).then(opts => {
      return this.manager.save(model.path, opts);
    }).then(contents => {
      this.clearDirty(widget);
      return contents;
    });
  }

  /**
   * Revert widget contents.
   *
   * @param widget - The widget to revert (defaults to current active widget).
   *
   * returns A promise that resolves to the new contents of the widget.
   *
   * #### Notes
   * This clears the dirty state of the widget after a successful revert.
   */
  revert(widget?: T): Promise<IContentsModel> {
    widget = this.resolveWidget(widget);
    if (!widget) {
      return Promise.resolve(void 0);
    }
    let model = this._getModel(widget);
    let opts = this.getFetchOptions(model);
    return this.manager.get(model.path, opts).then(contents => {
      return this.populateWidget(widget, contents);
    }).then(contents => {
      this.clearDirty(widget);
      return contents;
    });
  }

  /**
   * Close a widget.
   *
   * @param widget - The widget to close (defaults to current active widget).
   *
   * returns A boolean indicating whether the widget was closed.
   */
  close(widget?: T): Promise<boolean> {
    widget = this.resolveWidget(widget);
    if (!widget) {
      return Promise.resolve(false);
    }
    if (widget.hasClass(DIRTY_CLASS)) {
      // TODO: implement a dialog here.
      console.log('CLOSING DIRTY FILE');
    }
    widget.dispose();
    let index = this._widgets.indexOf(widget);
    this._widgets.splice(index, 1);
    if (widget === this.activeWidget) {
      this._activeWidget = null;
    }
    return Promise.resolve(true);
  }

  /**
   * Close all widgets.
   */
  closeAll(): void {
    for (let w of this._widgets) {
      w.close();
    }
    this._activeWidget = null;
  }

  /**
   * Get whether a widget is dirty (defaults to current active widget).
   */
  isDirty(widget?: T): boolean {
    return Private.dirtyProperty.get(this.resolveWidget(widget));
  }

  /**
   * Set the dirty state of a widget (defaults to current active widget).
   */
  setDirty(widget?: T): void {
    Private.dirtyProperty.set(this.resolveWidget(widget), true);
  }

  /**
   * Clear the dirty state of a widget (defaults to current active widget).
   */
  clearDirty(widget?: T): void {
    Private.dirtyProperty.set(this.resolveWidget(widget), false);
  }

  /**
   * Filter messages on the widget.
   */
  filterMessage(handler: IMessageHandler, msg: Message): boolean {
    let widget = this.resolveWidget(handler as T);
    if (msg.type == 'close-request' && widget) {
      this.close(widget);
      return true;
    }
    return false;
  }

  /**
   * Get options use to fetch the model contents from disk.
   *
   * #### Notes
   * Subclasses are free to use any or none of the information in
   * the model.
   */
  protected getFetchOptions(model: IContentsModel): IContentsOpts {
    return { type: 'file', format: 'text' };
  }

  /**
   * Get the options used to save the widget content.
   */
  protected abstract getSaveOptions(widget: T, model: IContentsModel): Promise<IContentsOpts>;

  /**
   * Create the widget from a model.
   */
  protected abstract createWidget(model: IContentsModel): T;

  /**
   * Populate a widget from an `IContentsModel`.
   *
   * #### Notes
   * Subclasses are free to use any or none of the information in
   * the model.  It is up to subclasses to handle setting dirty state when
   * the widget contents change.  See [[AbstractFileHandler.dirtyProperty]].
   */
  protected abstract populateWidget(widget: T, model: IContentsModel): Promise<IContentsModel>;

  /**
   * Set the appropriate title text based on a model.
   */
  protected getTitleText(model: IContentsModel): string {
    return model.name;
  }

  /**
   * Get the model for a given widget.
   */
  private _getModel(widget: T): IContentsModel {
    return Private.modelProperty.get(widget);
  }

  /**
   * Set the model for a widget.
   */
  private _setModel(widget: T, model: IContentsModel) {
    Private.modelProperty.set(widget, model);
  }

  /**
   * Resolve a given widget.
   */
  protected resolveWidget(widget: T): T {
    widget = widget || this.activeWidget;
    if (this._widgets.indexOf(widget) === -1) {
      return;
    }
    return widget;
  }

  /**
   * Find a widget given a model.
   */
  protected findWidgetByModel(model: IContentsModel): T {
    return arrays.find(this._widgets, widget => this._getModel(widget).path === model.path);
  }

  /**
   * Handle a focus events.
   */
  private _onFocus = (event: Event) => {
    let target = event.target as HTMLElement;
    let prev = this.activeWidget;
    let widget = arrays.find(this._widgets,
      w => w.isVisible && w.node.contains(target));
    if (widget) {
      this._activeWidget = widget;
      if (!prev) this.activated.emit(void 0);
    }
  }

  private _activeWidget: T = null;
  private _manager: IContentsManager = null;
  private _widgets: T[] = [];
}


/**
 * An implementation of a file handler.
 */
export
class FileHandler extends AbstractFileHandler<CodeMirrorWidget> {
  /**
   * Get the options used to save the widget content.
   */
  protected getSaveOptions(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsOpts> {
    let name = model.path.split('/').pop();
    name = name.split('.')[0];
    let content = (widget as CodeMirrorWidget).editor.getDoc().getValue();
    return Promise.resolve({ path: model.path, content, name,
                             type: 'file', format: 'text' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(model: IContentsModel): CodeMirrorWidget {
    let widget = new CodeMirrorWidget();
    widget.editor.on('change', () => this.setDirty(widget));
    return widget;
  }

  /**
   * Populate a widget from an `IContentsModel`.
   */
  protected populateWidget(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsModel> {
    widget.editor.getDoc().setValue(model.content);
    loadModeByFileName(widget.editor, model.name);
    return Promise.resolve(model);
  }

}

/** 
 * A private namespace for AbstractFileHandler data.
 */
namespace Private {
  /**
   * An attached property with the widget model.
   */
  export
  const modelProperty = new Property<Widget, IContentsModel>({
    name: 'model',
    value: null
  });

  /**
   * An attached property with the widget dirty state.
   */
  export
  const dirtyProperty = new Property<Widget, boolean>({
    name: 'dirty',
    value: false,
    changed: (widget: Widget, oldValue: boolean, newValue: boolean) => {
      if (newValue) {
        widget.title.className += ` ${DIRTY_CLASS}`;
      } else {
        widget.title.className = widget.title.className.replace(DIRTY_CLASS, '');
      }
    }
  });

  /**
   * A signal emitted when a file handler is activated.
   */
  export
  const activatedSignal = new Signal<AbstractFileHandler<Widget>, void>();

  /**
   * A signal emitted when a file handler has finished populating a widget.
   */
  export
  const finishedSignal = new Signal<AbstractFileHandler<Widget>, IContentsModel>();
}
