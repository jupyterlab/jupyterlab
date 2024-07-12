// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module property-inspector
 */

import { ILabShell } from '@jupyterlab/application';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { ReactWidget } from '@jupyterlab/ui-components';
import { ISignal, Signal } from '@lumino/signaling';
import { FocusTracker, SingletonLayout, Widget } from '@lumino/widgets';
import * as React from 'react';
import { IPropertyInspector, IPropertyInspectorProvider } from './token';

export { IPropertyInspector, IPropertyInspectorProvider };

/**
 * The implementation of the PropertyInspector.
 */
abstract class PropertyInspectorProvider
  extends Widget
  implements IPropertyInspectorProvider
{
  /**
   * Construct a new Property Inspector.
   */
  constructor() {
    super();
    this.addClass('jp-PropertyInspector');
    this._tracker = new FocusTracker();
    this._tracker.currentChanged.connect(this._onCurrentChanged, this);
  }

  /**
   * Register a widget in the property inspector provider.
   *
   * @param widget The owner widget to register.
   */
  register(widget: Widget): IPropertyInspector {
    if (this._inspectors.has(widget)) {
      throw new Error('Widget is already registered');
    }
    const inspector = new Private.PropertyInspector(widget);
    widget.disposed.connect(this._onWidgetDisposed, this);
    this._inspectors.set(widget, inspector);
    inspector.onAction.connect(this._onInspectorAction, this);
    this._tracker.add(widget);
    return inspector;
  }

  /**
   * The current widget being tracked by the inspector.
   */
  protected get currentWidget(): Widget | null {
    return this._tracker.currentWidget;
  }

  /**
   * Refresh the content for the current widget.
   */
  protected refresh(): void {
    const current = this._tracker.currentWidget;
    if (!current) {
      this.setContent(null);
      return;
    }
    const inspector = this._inspectors.get(current);
    if (inspector) {
      this.setContent(inspector.content);
    }
  }

  /**
   * Show the provider panel.
   */
  protected abstract showPanel(): void;

  /**
   * Set the content of the provider.
   */
  protected abstract setContent(content: Widget | null): void;

  /**
   * Handle the disposal of a widget.
   */
  private _onWidgetDisposed(sender: Widget): void {
    const inspector = this._inspectors.get(sender);
    if (inspector) {
      inspector.dispose();
      this._inspectors.delete(sender);
    }
  }

  /**
   * Handle inspector actions.
   */
  private _onInspectorAction(
    sender: Private.PropertyInspector,
    action: Private.PropertyInspectorAction
  ) {
    const owner = sender.owner;
    const current = this._tracker.currentWidget;
    switch (action) {
      case 'content':
        if (current === owner) {
          this.setContent(sender.content);
        }
        break;
      case 'dispose':
        if (owner) {
          this._tracker.remove(owner);
          this._inspectors.delete(owner);
        }
        break;
      case 'show-panel':
        if (current === owner) {
          this.showPanel();
        }
        break;
      default:
        throw new Error('Unsupported inspector action');
    }
  }

  /**
   * Handle a change to the current widget in the tracker.
   */
  private _onCurrentChanged(): void {
    const current = this._tracker.currentWidget;
    if (current) {
      const inspector = this._inspectors.get(current);
      const content = inspector!.content;
      this.setContent(content);
    } else {
      this.setContent(null);
    }
  }

  private _tracker = new FocusTracker();
  private _inspectors = new Map<Widget, Private.PropertyInspector>();
}

/**
 * {@link SideBarPropertyInspectorProvider} constructor options
 */
export interface ILabPropertyInspectorOptions {
  /**
   * Application shell
   */
  shell: ILabShell;
  /**
   * Widget placeholder
   */
  placeholder?: Widget;
  /**
   * Application translation
   */
  translator?: ITranslator;
}

/**
 * A class that adds a property inspector provider to the
 * JupyterLab sidebar.
 */
export class SideBarPropertyInspectorProvider extends PropertyInspectorProvider {
  /**
   * Construct a new Side Bar Property Inspector.
   */
  constructor({
    shell,
    placeholder,
    translator
  }: ILabPropertyInspectorOptions) {
    super();
    this._labshell = shell;
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    const layout = (this.layout = new SingletonLayout());
    if (placeholder) {
      this._placeholder = placeholder;
    } else {
      const node = document.createElement('div');
      const content = document.createElement('div');
      const placeholderHeadline = document.createElement('h3');
      const placeholderText = document.createElement('p');
      placeholderHeadline.textContent = this._trans.__('No Properties');
      placeholderText.textContent = this._trans.__(
        'The property inspector allows to view and edit properties of a selected notebook.'
      );
      content.className = 'jp-PropertyInspector-placeholderContent';
      content.appendChild(placeholderHeadline);
      content.appendChild(placeholderText);
      node.appendChild(content);
      this._placeholder = new Widget({ node });
      this._placeholder.addClass('jp-PropertyInspector-placeholder');
    }
    layout.widget = this._placeholder;
    this._labshell.currentChanged.connect(this._onShellCurrentChanged, this);
    this._onShellCurrentChanged();
  }

  /**
   * Set the content of the sidebar panel.
   */
  protected setContent(content: Widget | null): void {
    const layout = this.layout as SingletonLayout;
    if (layout.widget) {
      layout.widget.removeClass('jp-PropertyInspector-content');
      layout.removeWidget(layout.widget);
    }
    if (!content) {
      content = this._placeholder;
    }
    content.addClass('jp-PropertyInspector-content');
    layout.widget = content;
  }

  /**
   * Show the sidebar panel.
   */
  showPanel(): void {
    this._labshell.activateById(this.id);
  }

  /**
   * Handle the case when the current widget is not in our tracker.
   */
  private _onShellCurrentChanged(): void {
    const current = this.currentWidget;
    if (!current) {
      this.setContent(null);
      return;
    }
    const currentShell = this._labshell.currentWidget;
    if (currentShell?.node.contains(current.node)) {
      this.refresh();
    } else {
      this.setContent(null);
    }
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _labshell: ILabShell;
  private _placeholder: Widget;
}

/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * A type alias for the actions a property inspector can take.
   */
  export type PropertyInspectorAction = 'content' | 'dispose' | 'show-panel';

  /**
   * An implementation of the property inspector used by the
   * property inspector provider.
   */
  export class PropertyInspector implements IPropertyInspector {
    /**
     * Construct a new property inspector.
     */
    constructor(owner: Widget) {
      this._owner = owner;
    }

    /**
     * The owner widget for the property inspector.
     */
    get owner(): Widget | null {
      return this._owner;
    }

    /**
     * The current content for the property inspector.
     */
    get content(): Widget | null {
      return this._content;
    }

    /**
     * Whether the property inspector is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * A signal used for actions related to the property inspector.
     */
    get onAction(): ISignal<PropertyInspector, PropertyInspectorAction> {
      return this._onAction;
    }

    /**
     * Show the property inspector panel.
     */
    showPanel(): void {
      if (this._isDisposed) {
        return;
      }
      this._onAction.emit('show-panel');
    }

    /**
     * Render the property inspector content.
     */
    render(widget: Widget | React.ReactElement): void {
      if (this._isDisposed) {
        return;
      }
      if (widget instanceof Widget) {
        this._content = widget;
      } else {
        this._content = ReactWidget.create(widget);
      }
      this._onAction.emit('content');
    }

    /**
     * Dispose of the property inspector.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      this._content = null;
      this._owner = null;
      Signal.clearData(this);
    }

    private _isDisposed = false;
    private _content: Widget | null = null;
    private _owner: Widget | null = null;
    private _onAction = new Signal<
      PropertyInspector,
      Private.PropertyInspectorAction
    >(this);
  }
}
