// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IStateDB
} from '../statedb';


/**
 * An object that tracks widget instances.
 */
export
interface IInstanceTracker<T extends Widget> {
  /**
   * A signal emitted when a widget is added or removed from the tracker.
   */
  readonly changed: ISignal<this, 'add' | 'remove'>;

  /**
   * A signal emitted when the current widget changes.
   *
   * #### Notes
   * If the last widget being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T>;

  /**
   * The current widget is the most recently focused widget.
   */
  readonly currentWidget: T;

  /**
   * The number of widgets held by the tracker.
   */
  readonly size: number;

  /**
   * Iterate through each widget in the tracker.
   *
   * @param fn - The function to call on each widget.
   */
  forEach(fn: (widget: T) => void): void;

  /**
   * Inject a foreign widget into the instance tracker.
   *
   * @param widget - The widget to inject into the tracker.
   *
   * #### Notes
   * Any widgets injected into an instance tracker will not have their state
   * or layout saved by the tracker. The primary use case for widget injection
   * is for a plugin that offers a sub-class of an extant plugin to have its
   * instances share the same commands as the parent plugin (since most relevant
   * commands will use the `currentWidget` of the parent plugin's instance
   * tracker). In this situation, the sub-class plugin may well have its own
   * instance tracker for layout and state restoration in addition to injecting
   * its widgets into the parent plugin's instance tracker.
   */
  inject(widget: T): void;
}


/**
 * A class that keeps track of widget instances.
 *
 * #### Notes
 * This is meant to be used in conjunction with a `FocusTracker` and will
 * typically be kept in sync with focus tracking events.
 *
 * The API surface area of this concrete implementation is substantially larger
 * than the instance tracker interface it implements. The interface is intended
 * for export by JupyterLab plugins that create widgets and have clients who may
 * wish to keep track of newly created widgets. This class, however, can be used
 * internally by plugins to restore state as well.
 */
export
class InstanceTracker<T extends Widget> implements IInstanceTracker<T>, IDisposable {
  /**
   * A signal emitted when a widget is added or removed from the tracker.
   */
  readonly changed: ISignal<this, 'add' | 'remove'>;

  /**
   * A signal emitted when the current widget changes.
   *
   * #### Notes
   * If the last widget being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T>;

  /**
   * The current widget is the most recently focused widget.
   */
  get currentWidget(): T {
    return this._currentWidget;
  }

  /**
   * Test whether the tracker is disposed.
   */
  get isDisposed(): boolean {
    return this._widgets === null;
  }

  /**
   * The number of widgets held by the tracker.
   */
  get size(): number {
    return this._widgets.size;
  }

  /**
   * Add a new widget to the tracker.
   *
   * @param widget - The widget being added.
   */
  add(widget: T, options: ILayoutRestorer.IAddOptions = { area: 'main' }): void {
    if (this._widgets.has(widget)) {
      console.warn(`${widget.id} already exists in the tracker.`);
      return;
    }
    this._widgets.add(widget);

    let injected = Private.injectedProperty.get(widget);

    // Handle widget state restoration.
    if (!injected && this._restore) {
      let { layout, namespace, state } = this._restore;
      let widgetName = this._restore.name(widget);

      if (widgetName) {
        let name = `${namespace}:${widgetName}`;
        let data = this._restore.args(widget);
        let metadata = options;

        Private.nameProperty.set(widget, name);
        Private.metadataProperty.set(widget, metadata);

        state.save(name, { data, metadata });

        if (layout) {
          layout.add(widget, name, options);
        }
      }
    }

    // Handle widget disposal.
    widget.disposed.connect(() => {
      this._widgets.delete(widget);
      // If restore data was saved, delete it from the database.
      if (!injected && this._restore) {
        let { state } = this._restore;
        let name = Private.nameProperty.get(widget);

        if (name) {
          state.remove(name);
        }
      }
      // Emit a changed signal.
      this.changed.emit('remove');
      // If this was the last widget, emit null for current widget signal.
      if (!this._widgets.size) {
        this._currentWidget = null;
        this.onCurrentChanged();
        this.currentChanged.emit(null);
      }
    });

    // Emit a changed signal.
    this.changed.emit('add');
  }

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._currentWidget = null;
    this._widgets.clear();
    this._widgets = null;
  }

  /**
   * Find the first widget in the tracker that satisfies a filter function.
   *
   * @param - fn The filter function to call on each widget.
   */
  find(fn: (widget: T) => boolean): T {
    let result: T = null;
    this._widgets.forEach(widget => {
      // If a result has already been found, short circuit.
      if (result) {
        return;
      }
      if (fn(widget)) {
        result = widget;
      }
    });
    return result;
  }

  /**
   * Iterate through each widget in the tracker.
   *
   * @param fn - The function to call on each widget.
   */
  forEach(fn: (widget: T) => void): void {
    this._widgets.forEach(widget => { fn(widget); });
  }

  /**
   * Inject a foreign widget into the instance tracker.
   *
   * @param widget - The widget to inject into the tracker.
   *
   * #### Notes
   * Any widgets injected into an instance tracker will not have their state
   * or layout saved by the tracker. The primary use case for widget injection
   * is for a plugin that offers a sub-class of an extant plugin to have its
   * instances share the same commands as the parent plugin (since most relevant
   * commands will use the `currentWidget` of the parent plugin's instance
   * tracker). In this situation, the sub-class plugin may well have its own
   * instance tracker for layout and state restoration in addition to injecting
   * its widgets into the parent plugin's instance tracker.
   */
  inject(widget: T): void {
    Private.injectedProperty.set(widget, true);
    this.add(widget);
  }

  /**
   * Check if this tracker has the specified widget.
   *
   * @param widget - The widget whose existence is being checked.
   */
  has(widget: Widget): boolean {
    return this._widgets.has(widget as any);
  }

  /**
   * Restore the widgets in this tracker's namespace.
   */
  restore(options: InstanceTracker.IRestoreOptions): Promise<any> {
    this._restore = options;

    let { command, namespace, registry, state, when } = options;
    let promises = [state.fetchNamespace(namespace)];

    if (when) {
      promises = promises.concat(when);
    }

    return Promise.all(promises).then(([saved]) => {
      return Promise.all(saved.map(item => {
        let args = (item.value as any).data;
        // Execute the command and if it fails, delete the state restore data.
        return registry.execute(command, args)
          .catch(() => { state.remove(args.id); });
      }));
    });
  }

  /**
   * Save the restore data for a given widget.
   *
   * @param widget - The widget being saved.
   */
  save(widget: T): void {
    let injected = Private.injectedProperty.get(widget);
    if (!this._restore || !this.has(widget) || injected) {
      return;
    }

    let { namespace, state } = this._restore;
    let widgetName = this._restore.name(widget);
    let oldName = Private.nameProperty.get(widget);
    let newName = widgetName ? `${namespace}:${widgetName}` : null;

    if (oldName && oldName !== newName) {
      state.remove(oldName);
    }

    // Set the name property irrespective of whether the new name is null.
    Private.nameProperty.set(widget, newName);

    if (newName) {
      let data = this._restore.args(widget);
      let metadata = Private.metadataProperty.get(widget);

      state.save(newName, { data, metadata });
    }
  }

  /**
   * Syncs the state of the tracker with a widget known to have focus.
   *
   * @param current The currently focused widget.
   *
   * @returns The current widget or `null` if there is none.
   *
   * #### Notes
   * Syncing acts as a gate returning a widget only if it is the current widget.
   */
  sync(current: Widget): T {
    if (this.isDisposed) {
      return;
    }

    if (current && this._widgets.has(current as any)) {
      // If no state change needs to occur, just bail.
      if (this._currentWidget === current) {
        return this._currentWidget;
      }
      this._currentWidget = current as T;
      this.onCurrentChanged();
      this.currentChanged.emit(this._currentWidget);
      return this._currentWidget;
    }

    return null;
  }

  /**
   * Handle the current change event.
   *
   * #### Notes
   * The default implementation is a no-op. This may be reimplemented by
   * subclasses to customize the behavior.
   */
  protected onCurrentChanged(): void {
    /* This is a no-op. */
  }

  private _currentWidget: T = null;
  private _restore: InstanceTracker.IRestoreOptions = null;
  private _widgets = new Set<T>();
}


// Define the signals for the `InstanceTracker` class.
defineSignal(InstanceTracker.prototype, 'changed');
defineSignal(InstanceTracker.prototype, 'currentChanged');


/**
 * A namespace for `InstanceTracker` statics.
 */
export
namespace InstanceTracker {
  /**
   * The state restoration configuration options.
   */
  export
  interface IRestoreOptions extends ILayoutRestorer.IRestoreOptions {
    /*
     * The layout restorer to use to re-arrange restored tabs.
     */
    layout: ILayoutRestorer;

    /**
     * The command registry which holds the restore command.
     */
    registry: CommandRegistry;

    /**
     * The state database instance.
     */
    state: IStateDB;
  }
}


/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property to indicate whether a widget has been injected.
   */
  export
  const injectedProperty = new AttachedProperty<Widget, boolean>({
    name: 'injected',
    value: false
  });

  /**
   * An attached property for a widget's restore metadata in the state database.
   */
  export
  const metadataProperty = new AttachedProperty<Widget, ILayoutRestorer.IAddOptions>({
    name: 'metadata'
  });

  /**
   * An attached property for a widget's ID in the state database.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({ name: 'name' });
}
