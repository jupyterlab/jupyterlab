/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IStateDB
} from '../statedb';


/* tslint:disable */
/**
 * The layout restorer token.
 */
export
const ILayoutRestorer = new Token<ILayoutRestorer>('jupyter.services.layout-restorer');
/* tslint:enable */


/**
 * A static class that restores the layout of the application when it reloads.
 */
export
interface ILayoutRestorer {
  /**
   * Add a widget to be tracked by the layout restorer.
   */
  add(widget: Widget, name: string): void;

  /**
   * Wait for the given promise to resolve before restoring layout.
   *
   * #### Notes
   * This function should only be called before the `first` promise passed in
   * at instantiation has resolved. See the notes for `LayoutRestorer.IOptions`.
   */
  await(promise: Promise<any>): void;
}


/**
 * The state database key for restorer data.
 */
const KEY = 'layout-restorer:data';


/**
 * The default implementation of a layout restorer.
 *
 * #### Notes
 * The layout restorer requires all of the tabs that will be rearranged and
 * focused to already exist, it does not rehydrate them.
 */
export
class LayoutRestorer implements ILayoutRestorer {
  /**
   * Create a layout restorer.
   */
  constructor(options: LayoutRestorer.IOptions) {
    this._state = options.state;
    options.first.then(() => Promise.all(this._promises)).then(() => {
      // Release the promises held in memory.
      this._promises = null;
      // Restore the application state.
      this._restore();
    });
  }

  /**
   * A signal emitted when a widget should be activated.
   */
  readonly activated: ISignal<this, Widget>;

  /**
   * Add a widget to be tracked by the layout restorer.
   */
  add(widget: Widget, name: string): void {
    Private.nameProperty.set(widget, name);
    this._widgets.set(name, widget);
    widget.disposed.connect(() => { this._widgets.delete(name); });
  }

  /**
   * Wait for the given promise to resolve before restoring layout.
   *
   * #### Notes
   * This function should only be called before the `first` promise passed in
   * at instantiation has resolved. See the notes for `LayoutRestorer.IOptions`.
   */
  await(promise: Promise<any>): void {
    if (!this._promises) {
      console.warn('await can only be called before app has started.');
      return;
    }

    this._promises.push(promise);
  }

  /**
   * Save the layout state for the application.
   */
  save(data: LayoutRestorer.IRestorable): Promise<void> {
    // If there are promises that are unresolved, bail.
    if (this._promises) {
      return Promise.resolve(void 0);
    }
    let dehydrated = this._dehydrate(data);
    console.log('actually saving state:', dehydrated);
    return this._state.save(KEY, dehydrated);
  }

  /**
   * Dehydrate the data to save.
   */
  private _dehydrate(data: LayoutRestorer.IRestorable): JSONObject {
    let name = Private.nameProperty.get(data.currentWidget);
    return name ? { currentWidget: name } : {};
  }

  /**
   * Restore the application state.
   */
  private _restore(): void {
    this._state.fetch(KEY).then(data => {
      console.log('restore', data);
      if (!data) {
        return;
      }

      let name = data['currentWidget'] as string;
      if (!name) {
        return;
      }

      let widget = this._widgets.get(name);
      if (widget) {
        this.activated.emit(widget);
      }
    });
  }

  private _promises: Promise<any>[] = [];
  private _state: IStateDB = null;
  private _widgets = new Map<string, Widget>();
}


// Define the signals for the `LayoutRestorer` class.
defineSignal(LayoutRestorer.prototype, 'activated');


/**
 * A namespace for `LayoutRestorer` statics.
 */
export
namespace LayoutRestorer {
  /**
   * The configuration options for layout restorer instantiation.
   */
  export
  interface IOptions {
    /**
     * The initial promise that has to be resolved before layout restoration.
     *
     * #### Notes
     * The lifecycle for state and layout restoration is subtle. This promise
     * is intended to equal the JupyterLab application `started` notifier.
     * The sequence of events is as follows:
     *
     * 1. The layout restorer plugin is instantiated.
     *
     * 2. Other plugins that care about state and layout restoration require
     *    the layout restorer as a dependency.
     *
     * 3. As each load-time plugin initializes (which happens before the lab
     *    application has `started`), it instructs the layout restorer whether
     *    the restorer ought to `await` its state restoration.
     *
     * 4. After all the load-time plugins have finished initializing, the lab
     *    application `started` promise will resolve. This is the `first`
     *    promise that the layout restorer waits for. By this point, all of the
     *    plugins that care about layout restoration will have instructed the
     *    layout restorer to `await` their restoration.
     *
     * 5. Each plugin will then proceed to restore its state and reinstantiate
     *    whichever widgets it wants to restore.
     *
     * 6. As each plugin finishes restoring, it resolves the promise that it
     *    instructed the layout restorer to `await` (in step 3).
     *
     * 7. After all of the promises that the restorer is awaiting have resolved,
     *    the restorer then proceeds to reconstruct the saved layout.
     *
     * Of particular note are steps 5 and 6: since state restoration of plugins
     * is accomplished by executing commands, the command that is used to
     * restore the state of each plugin must return a promise that only resolves
     * when the widget has been created and added to the plugin's instance
     * tracker.
     */
    first: Promise<any>;

    /**
     * The state database instance.
     */
    state: IStateDB;
  }

  /**
   * A restorable user interface.
   */
  export
  interface IRestorable {
    /**
     * The current widget that has application focus.
     */
    currentWidget: Widget;
  }
}

/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for a widget's ID in the state database.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({ name: 'name' });
}
