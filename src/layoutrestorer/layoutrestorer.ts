/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  utils
} from '@jupyterlab/services';

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
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  ApplicationShell
} from '../application/shell';

import {
  InstanceTracker
} from '../common/instancetracker';

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
   * A promise resolved when the layout restorer is ready to receive signals.
   */
  restored: Promise<void>;

  /**
   * Add a widget to be tracked by the layout restorer.
   */
  add(widget: Widget, name: string, options?: ILayoutRestorer.IAddOptions): void;

  /**
   * Restore the widgets of a particular instance tracker.
   *
   * @param tracker - The instance tracker whose widgets will be restored.
   *
   * @param options - The restoration options.
   */
  restore(tracker: InstanceTracker<any>, options: ILayoutRestorer.IRestoreOptions): void;
}


/**
 * A namespace for layout restorers.
 */
export
namespace ILayoutRestorer {
  /**
   * Configuration options for adding a widget to a layout restorer.
   */
  export
  interface IAddOptions extends JSONObject {
    /**
     * The area in the application shell where a given widget will be restored.
     */
    area: ApplicationShell.Area;
  }

  /**
   * The state restoration configuration options.
   */
  export
  interface IRestoreOptions {
    /**
     * The command to execute when restoring instances.
     */
    command: string;

    /**
     * A function that returns the args needed to restore an instance.
     */
    args: (widget: Widget) => JSONObject;

    /**
     * A function that returns a unique persistent name for this instance.
     */
    name: (widget: Widget) => string;

    /**
     * The namespace to occupy in the state database for restoration data.
     */
    namespace: string;

    /**
     * The point after which it is safe to restore state.
     *
     * #### Notes
     * By definition, this promise or promises will happen after the application
     * has `started`.
     */
    when?: Promise<any> | Array<Promise<any>>;
  }
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
    this._first = options.first;
    this._first.then(() => Promise.all(this._promises)).then(() => {
      // Release the promises held in memory.
      this._first = null;
      this._promises = null;
      // Restore the application state.
      return this._restore();
    }).then(() => { this._restored.resolve(void 0); });
  }

  /**
   * A signal emitted when a widget should be activated.
   */
  readonly activated: ISignal<this, string>;

  /**
   * A promise resolved when the layout restorer is ready to receive signals.
   */
  get restored(): Promise<void> {
    return this._restored.promise;
  }

  /**
   * Add a widget to be tracked by the layout restorer.
   */
  add(widget: Widget, name: string, options: ILayoutRestorer.IAddOptions = { area: 'main' }): void {
    Private.nameProperty.set(widget, name);
    this._widgets.set(name, widget);
    widget.disposed.connect(() => { this._widgets.delete(name); });
  }

  /**
   * Restore the widgets of a particular instance tracker.
   *
   * @param tracker - The instance tracker whose widgets will be restored.
   *
   * @param options - The restoration options.
   */
  restore(tracker: InstanceTracker<any>, options: ILayoutRestorer.IRestoreOptions): void {
    if (!this._promises) {
      console.warn('restore can only be called before app has started.');
      return;
    }

    let { args, command, name, namespace, when } = options;
    this._promises.push(tracker.restore({
      args, command, name, namespace, when,
      layout: this,
      registry: this._registry,
      state: this._state
    }));
  }

  /**
   * Save the layout state for the application.
   */
  save(data: LayoutRestorer.IRestorable): Promise<void> {
    // If there are promises that are unresolved, bail.
    if (this._promises) {
      return Promise.resolve(void 0);
    }
    let promise: Promise<void>;
    if (data.currentWidget) {
      let name = Private.nameProperty.get(data.currentWidget);
      if (name) {
        promise = this._state.save(KEY, { currentWidget: name });
      }
    }
    return promise || this._state.remove(KEY);
  }

  /**
   * Restore the application state.
   */
  private _restore(): Promise<void> {
    return this._state.fetch(KEY).then(data => {
      if (!data) {
        return;
      }

      let name = data['currentWidget'] as string;
      if (!name) {
        return;
      }

      let widget = this._widgets.get(name);
      if (widget) {
        this.activated.emit(widget.id);
      }
    });
  }

  private _first: Promise<any> = null;
  private _promises: Promise<any>[] = [];
  private _restored = new utils.PromiseDelegate<void>();
  private _registry: CommandRegistry = null;
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
     *    the restorer ought to `restore` its state.
     *
     * 4. After all the load-time plugins have finished initializing, the lab
     *    application `started` promise will resolve. This is the `first`
     *    promise that the layout restorer waits for. By this point, all of the
     *    plugins that care about layout restoration will have instructed the
     *    layout restorer to `restore` their state.
     *
     * 5. The layout restorer will then instruct each plugin's instance tracker
     *    to restore its state and reinstantiate whichever widgets it wants.
     *
     * 6. As each instance finishes restoring, it resolves the promise that was
     *    made to the layout restorer (in step 5).
     *
     * 7. After all of the promises that the restorer is awaiting have resolved,
     *    the restorer then reconstructs the saved layout.
     *
     * Of particular note are steps 5 and 6: since state restoration of plugins
     * is accomplished by executing commands, the command that is used to
     * restore the state of each plugin must return a promise that only resolves
     * when the widget has been created and added to the plugin's instance
     * tracker.
     */
    first: Promise<any>;

    /**
     * The application command registry.
     */
    registry: CommandRegistry;

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
