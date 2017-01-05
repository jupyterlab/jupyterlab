/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  utils
} from '@jupyterlab/services';

import {
  IIterator
} from 'phosphor/lib/algorithm/iteration';

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
  InstanceTracker
} from '../common/instancetracker';

import {
  IStateDB
} from '../statedb';


/* tslint:disable */
/**
 * The instance restorer token.
 */
export
const IInstanceRestorer = new Token<IInstanceRestorer>('jupyter.services.instance-restorer');
/* tslint:enable */


/**
 * A static class that restores the widgets of the application when it reloads.
 */
export
interface IInstanceRestorer {
  /**
   * A promise resolved when the instance restorer is ready to receive signals.
   */
  restored: Promise<void>;

  /**
   * Add a widget to be tracked by the instance restorer.
   */
  add(widget: Widget, name: string): void;

  /**
   * Restore the widgets of a particular instance tracker.
   *
   * @param tracker - The instance tracker whose widgets will be restored.
   *
   * @param options - The restoration options.
   */
  restore(tracker: InstanceTracker<any>, options: IInstanceRestorer.IRestoreOptions<any>): void;
}


/**
 * A namespace for instance restorers.
 */
export
namespace IInstanceRestorer {
  /**
   * A description of the application's user interface layout.
   */
  export
  interface ILayout {
    /**
     * The current widget that has application focus.
     */
    currentWidget: Widget;

    /**
     * The left area of the user interface.
     */
    leftArea: ISideArea;

    /**
     * The right area of the user interface.
     */
    rightArea: ISideArea;
  }

  /**
   * The restorable description of a sidebar in the user interface.
   */
  export
  interface ISideArea {
    /**
     * A flag denoting whether the sidebar has been collapsed.
     */
    collapsed: boolean;

    /**
     * The current widget that has side area focus.
     */
    currentWidget: Widget;

    /**
     * The collection of widgets held by the sidebar.
     */
    widgets: IIterator<Widget>;
  }

  /**
   * The state restoration configuration options.
   */
  export
  interface IRestoreOptions<T extends Widget> {
    /**
     * The command to execute when restoring instances.
     */
    command: string;

    /**
     * A function that returns the args needed to restore an instance.
     */
    args: (widget: T) => JSONObject;

    /**
     * A function that returns a unique persistent name for this instance.
     */
    name: (widget: T) => string;

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
const KEY = 'instance-restorer:data';


/**
 * The default implementation of an instance restorer.
 *
 * #### Notes
 * The lifecycle for state restoration is subtle. The sequence of events is:
 *
 * 1. The instance restorer plugin is instantiated.
 *
 * 2. Other plugins that care about state restoration require the instance
 *    restorer as a dependency.
 *
 * 3. As each load-time plugin initializes (which happens before the lab
 *    application has `started`), it instructs the instance restorer whether
 *    the restorer ought to `restore` its state.
 *
 * 4. After all the load-time plugins have finished initializing, the lab
 *    application `started` promise will resolve. This is the `first`
 *    promise that the instance restorer waits for. By this point, all of the
 *    plugins that care about restoration will have instructed the instance
 *    restorer to `restore` their state.
 *
 * 5. The instance restorer will then instruct each plugin's instance tracker
 *    to restore its state and reinstantiate whichever widgets it wants.
 *
 * 6. As each instance finishes restoring, it resolves the promise that was
 *    made to the instance restorer (in step 5).
 *
 * 7. After all of the promises that the restorer is awaiting have resolved,
 *    the restorer then resolves its `restored` promise allowing the application
 *    shell to rehydrate its former layout.
 *
 * Of particular note are steps 5 and 6: since state restoration of plugins
 * is accomplished by executing commands, the command that is used to
 * restore the state of each plugin must return a promise that only resolves
 * when the widget has been created and added to the plugin's instance
 * tracker.
 */
export
class InstanceRestorer implements IInstanceRestorer {
  /**
   * Create an instance restorer.
   */
  constructor(options: InstanceRestorer.IOptions) {
    this._registry = options.registry;
    this._state = options.state;
    options.first.then(() => Promise.all(this._promises)).then(() => {
      // Release the promises held in memory.
      this._promises = null;
      // Release the tracker set.
      this._trackers.clear();
      this._trackers = null;
      // Restore the application state.
      return this._restore();
    }).then(() => { this._restored.resolve(void 0); });
  }

  /**
   * A signal emitted when a widget should be activated.
   */
  readonly activated: ISignal<this, string>;

  /**
   * A promise resolved when the instance restorer is ready to receive signals.
   */
  get restored(): Promise<void> {
    return this._restored.promise;
  }

  /**
   * Add a widget to be tracked by the instance restorer.
   */
  add(widget: Widget, name: string): void {
    Private.nameProperty.set(widget, name);
    this._widgets.set(name, widget);
    widget.disposed.connect(() => { this._widgets.delete(name); });
  }

  /**
   * Fetch the layout state for the application.
   */
  fetch(): Promise<IInstanceRestorer.ILayout> {
    return Promise.resolve(null);
  }

  /**
   * Restore the widgets of a particular instance tracker.
   *
   * @param tracker - The instance tracker whose widgets will be restored.
   *
   * @param options - The restoration options.
   */
  restore(tracker: InstanceTracker<Widget>, options: IInstanceRestorer.IRestoreOptions<Widget>): void {
    if (!this._promises) {
      console.warn('restore() can only be called before `first` has resolved.');
      return;
    }

    let { namespace } = tracker;
    if (this._trackers.has(namespace)) {
      console.warn(`A tracker namespaced ${namespace} was already restored.`);
      return;
    }
    this._trackers.add(namespace);

    let { args, command, name, when } = options;
    this._promises.push(tracker.restore({
      args, command, name, when,
      registry: this._registry,
      restorer: this,
      state: this._state
    }));
  }

  /**
   * Save the layout state for the application.
   */
  save(data: IInstanceRestorer.ILayout): Promise<void> {
    // If there are promises that are unresolved, bail.
    if (this._promises) {
      console.warn('save() was called prematurely.');
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

  private _promises: Promise<any>[] = [];
  private _restored = new utils.PromiseDelegate<void>();
  private _registry: CommandRegistry = null;
  private _state: IStateDB = null;
  private _trackers = new Set<string>();
  private _widgets = new Map<string, Widget>();
}


// Define the signals for the `InstanceRestorer` class.
defineSignal(InstanceRestorer.prototype, 'activated');


/**
 * A namespace for `InstanceRestorer` statics.
 */
export
namespace InstanceRestorer {
  /**
   * The configuration options for instance restorer instantiation.
   */
  export
  interface IOptions {
    /**
     * The initial promise that has to be resolved before restoration.
     *
     * #### Notes
     * This promise should equal the JupyterLab application `started` notifier.
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
