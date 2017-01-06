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
   * An application layout data store.
   */
  export
  interface ILayoutDB {
    /**
     * Fetch the layout state for the application.
     *
     * #### Notes
     * Fetching the layout relies on all widget restoration to be complete, so
     * calls to `fetch` are guaranteed to return after restoration is complete.
     */
    fetch(): Promise<IInstanceRestorer.ILayout>;

    /**
     * Save the layout state for the application.
     */
    save(data: IInstanceRestorer.ILayout): Promise<void>;
  }

  /**
   * A description of the application's user interface layout.
   */
  export
  interface ILayout {
    /**
     * The current widget that has application focus.
     */
    currentWidget: Widget | null;

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
    currentWidget: Widget | null;

    /**
     * The collection of widgets held by the sidebar.
     */
    widgets: Array<Widget> | null;
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
   *
   * #### Notes
   * Fetching the layout relies on all widget restoration to be complete, so
   * calls to `fetch` are guaranteed to return after restoration is complete.
   */
  fetch(): Promise<IInstanceRestorer.ILayout> {
    let layout = this._state.fetch(KEY);
    return Promise.all([layout, this.restored]).then(([data]) => {
      let rehydrated: IInstanceRestorer.ILayout = {
        currentWidget: null,
        leftArea: { collapsed: true, currentWidget: null, widgets: null },
        rightArea: { collapsed: true, currentWidget: null, widgets: null }
      };

      if (!data) {
        return rehydrated;
      }

      let { current, left, right } = data as InstanceRestorer.IDehydratedLayout;

      // Rehydrate main area.
      if (current && this._widgets.has(current)) {
        rehydrated.currentWidget = this._widgets.get(current);
      }

      // Rehydrate left area.
      rehydrated.leftArea = this._rehydrateSideArea(left);

      // Rehydrate right area.
      rehydrated.rightArea = this._rehydrateSideArea(right);

      return rehydrated;
    });
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

    let dehydrated: InstanceRestorer.IDehydratedLayout = {};
    let current: string;

    // Dehydrate main area.
    if (data.currentWidget) {
      current = Private.nameProperty.get(data.currentWidget);
      if (current) {
        dehydrated.current = current;
      }
    }

    // Dehydrate left area.
    dehydrated.left = this._dehydrateSideArea(data.leftArea);

    // Dehydrate right area.
    dehydrated.right = this._dehydrateSideArea(data.rightArea);

    return this._state.save(KEY, dehydrated);
  }

  private _dehydrateSideArea(area: IInstanceRestorer.ISideArea): InstanceRestorer.ISideArea {
    let dehydrated: InstanceRestorer.ISideArea = { collapsed: area.collapsed };
    if (area.currentWidget) {
      let current = Private.nameProperty.get(area.currentWidget);
      if (current) {
        dehydrated.current = current;
      }
    }
    return dehydrated;
  }

  private _rehydrateSideArea(area: InstanceRestorer.ISideArea): IInstanceRestorer.ISideArea {
    let rehydrated: IInstanceRestorer.ISideArea = {
      collapsed: true,
      currentWidget: null,
      widgets: null
    };
    let widgets = this._widgets;
    if (!area) {
      return rehydrated;
    }
    if (area.hasOwnProperty('collapsed')) {
      rehydrated.collapsed = !!area.collapsed;
    }
    if (area.current && widgets.has(area.current)) {
      rehydrated.currentWidget = widgets.get(area.current);
    }
    if (Array.isArray(area.widgets)) {
      rehydrated.widgets = area.widgets
        .map(name => widgets.has(name) ? widgets.get(name) : null)
        .filter(widget => !!widget);
    }
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

  /**
   * The dehydrated state of the application layout.
   *
   * #### Notes
   * This format is JSON serializable and only used internally by the instance
   * restorer to read and write to the state database. It is meant to be a data
   * structure that the instance restorer can translate into an
   * `IInstanceTracker.ILayout` data structure for consumption by the
   * application shell.
   */
  export
  interface IDehydratedLayout extends JSONObject {
    /**
     * The current widget that has application focus.
     */
    current?: string | null;

    /**
     * The left area of the user interface.
     */
    left?: ISideArea | null;

    /**
     * The right area of the user interface.
     */
    right?: ISideArea | null;
  }

  /**
   * The restorable description of a sidebar in the user interface.
   */
  export
  interface ISideArea extends JSONObject {
    /**
     * A flag denoting whether the sidebar has been collapsed.
     */
    collapsed?: boolean | null;

    /**
     * The current widget that has side area focus.
     */
    current?: string | null;

    /**
     * The collection of widgets held by the sidebar.
     */
    widgets?: Array<string> | null;
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
