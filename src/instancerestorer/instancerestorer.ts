/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Token
} from '@phosphor/application';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  Widget
} from '@phosphor/widgets';

import {
  ApplicationShell, InstanceTracker
} from '../application';

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
 * 1. The instance restorer plugin is instantiated. It installs itself as the
 *    layout database that the application shell can use to `fetch` and `save`
 *    layout restoration data.
 *
 * 2. Other plugins that care about state restoration require the instance
 *    restorer as a dependency.
 *
 * 3. As each load-time plugin initializes (which happens before the lab
 *    application has `started`), it instructs the instance restorer whether
 *    the restorer ought to `restore` its state by passing in its tracker.
 *    Alternatively, a plugin that does not require its own instance tracker
 *    (because perhaps it only creates a single widget, like a command palette),
 *    can simply `add` its widget along with a persistent unique name to the
 *    instance restorer so that its layout state can be restored when the lab
 *    application restores.
 *
 * 4. After all the load-time plugins have finished initializing, the lab
 *    application `started` promise will resolve. This is the `first`
 *    promise that the instance restorer waits for. By this point, all of the
 *    plugins that care about restoration will have instructed the instance
 *    restorer to `restore` their state.
 *
 * 5. The instance restorer will then instruct each plugin's instance tracker
 *    to restore its state and reinstantiate whichever widgets it wants. The
 *    tracker returns a promise to the instance restorer that resolves when it
 *    has completed restoring the tracked widgets it cares about.
 *
 * 6. As each instance finishes restoring, it resolves the promise that was
 *    made to the instance restorer (in step 5). After all of the promises that
 *    the restorer is awaiting have resolved, the restorer then resolves its
 *    `restored` promise allowing the application shell to rehydrate its saved
 *    layout.
 *
 * Of particular note are steps 5 and 6: since state restoration of plugins
 * is accomplished by executing commands, the command that is used to restore
 * the state of each plugin must return a promise that only resolves when the
 * widget has been created and added to the plugin's instance tracker.
 */
export
class InstanceRestorer implements IInstanceRestorer {
  /**
   * Create an instance restorer.
   */
  constructor(options: InstanceRestorer.IOptions) {
    this._registry = options.registry;
    this._state = options.state;
    this._first = options.first;
    this._first.then(() => Promise.all(this._promises)).then(() => {
      // Release the promises held in memory.
      this._promises = null;
      // Release the tracker set.
      this._trackers.clear();
      this._trackers = null;
    }).then(() => { this._restored.resolve(void 0); });
  }

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
    widget.disposed.connect(this._onWidgetDisposed, this);
  }

  /**
   * Fetch the layout state for the application.
   *
   * #### Notes
   * Fetching the layout relies on all widget restoration to be complete, so
   * calls to `fetch` are guaranteed to return after restoration is complete.
   */
  fetch(): Promise<ApplicationShell.ILayout> {
    const blank: ApplicationShell.ILayout = {
      fresh: true,
      mainArea: null,
      leftArea: { collapsed: true, currentWidget: null, widgets: null },
      rightArea: { collapsed: true, currentWidget: null, widgets: null }
    };
    let layout = this._state.fetch(KEY);

    return Promise.all([layout, this.restored]).then(([data]) => {
      if (!data) {
        return blank;
      }

      const { main, left, right } = data as Private.ILayout;

      // If any data exists, then this is not a fresh session.
      const fresh = false;

      // Rehydrate main area.
      const mainArea = this._rehydrateMainArea(main);

      // Rehydrate left area.
      const leftArea = this._rehydrateSideArea(left);

      // Rehydrate right area.
      const rightArea = this._rehydrateSideArea(right);

      return { fresh, mainArea, leftArea, rightArea };
    }).catch(() => blank); // Let fetch fail gracefully; return blank slate.
  }

  /**
   * Restore the widgets of a particular instance tracker.
   *
   * @param tracker - The instance tracker whose widgets will be restored.
   *
   * @param options - The restoration options.
   */
  restore(tracker: InstanceTracker<Widget>, options: IInstanceRestorer.IRestoreOptions<Widget>): Promise<any> {
    if (!this._promises) {
      let warning = 'restore() can only be called before `first` has resolved.';
      console.warn(warning);
      return Promise.reject(warning);
    }

    let { namespace } = tracker;
    if (this._trackers.has(namespace)) {
      let warning = `A tracker namespaced ${namespace} was already restored.`;
      console.warn(warning);
      return Promise.reject(warning);
    }
    this._trackers.add(namespace);

    let { args, command, name, when } = options;
    let first = this._first;

    let promise = tracker.restore({
      args, command, name,
      registry: this._registry,
      restorer: this,
      state: this._state,
      when: when ? [first].concat(when) : first
    });

    this._promises.push(promise);
    return promise;
  }

  /**
   * Save the layout state for the application.
   */
  save(data: ApplicationShell.ILayout): Promise<void> {
    // If there are promises that are unresolved, bail.
    if (this._promises) {
      let warning = 'save() was called prematurely.';
      console.warn(warning);
      return Promise.reject(warning);
    }

    let dehydrated: Private.ILayout = {};

    // Dehydrate main area.
    dehydrated.main = this._dehydrateMainArea(data.mainArea);

    // Dehydrate left area.
    dehydrated.left = this._dehydrateSideArea(data.leftArea);

    // Dehydrate right area.
    dehydrated.right = this._dehydrateSideArea(data.rightArea);

    return this._state.save(KEY, dehydrated);
  }

  /**
   * Dehydrate a main area description into a serializable object.
   */
  private _dehydrateMainArea(area: ApplicationShell.IMainArea): Private.IMainArea {
    return Private.serializeMain(area);
  }

  /**
   * Reydrate a serialized main area description object.
   *
   * #### Notes
   * This function consumes data that can become corrupted, so it uses type
   * coercion to guarantee the dehydrated object is safely processed.
   */
  private _rehydrateMainArea(area: Private.IMainArea): ApplicationShell.IMainArea {
    return Private.deserializeMain(area, this._widgets);
  }

  /**
   * Dehydrate a side area description into a serializable object.
   */
  private _dehydrateSideArea(area: ApplicationShell.ISideArea): Private.ISideArea {
    let dehydrated: Private.ISideArea = { collapsed: area.collapsed };
    if (area.currentWidget) {
      let current = Private.nameProperty.get(area.currentWidget);
      if (current) {
        dehydrated.current = current;
      }
    }
    if (area.widgets) {
      dehydrated.widgets = area.widgets
        .map(widget => Private.nameProperty.get(widget))
        .filter(name => !!name);
    }
    return dehydrated;
  }

  /**
   * Reydrate a serialized side area description object.
   *
   * #### Notes
   * This function consumes data that can become corrupted, so it uses type
   * coercion to guarantee the dehydrated object is safely processed.
   */
  private _rehydrateSideArea(area: Private.ISideArea): ApplicationShell.ISideArea {
    if (!area) {
      return { collapsed: true, currentWidget: null, widgets: null };
    }
    let internal = this._widgets;
    const collapsed = area.hasOwnProperty('collapsed') ? !!area.collapsed
      : false;
    const currentWidget = area.current && internal.has(`${area.current}`) ?
      internal.get(`${area.current}`) : null;
    const widgets = !Array.isArray(area.widgets) ? null
      : area.widgets
          .map(name => internal.has(`${name}`) ? internal.get(`${name}`) : null)
          .filter(widget => !!widget);
    return { collapsed, currentWidget, widgets };
  }

  /**
   * Handle a widget disposal.
   */
  private _onWidgetDisposed(widget: Widget): void {
    let name = Private.nameProperty.get(widget);
    this._widgets.delete(name);
  }

  private _first: Promise<any> = null;
  private _promises: Promise<any>[] = [];
  private _restored = new PromiseDelegate<void>();
  private _registry: CommandRegistry = null;
  private _state: IStateDB = null;
  private _trackers = new Set<string>();
  private _widgets = new Map<string, Widget>();
}


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
   * The dehydrated state of the application layout.
   *
   * #### Notes
   * This format is JSON serializable and saved in the state database.
   * It is meant to be a data structure can translate into an
   * `ApplicationShell.ILayout` data structure for consumption by
   * the application shell.
   */
  export
  interface ILayout extends JSONObject {
    /**
     * The main area of the user interface.
     */
    main?: IMainArea | null;

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
   * The restorable description of the main application area.
   */
  export
  interface IMainArea extends JSONObject {
    /**
     * The current widget that has application focus.
     */
    current?: string | null;

    /**
     * The main application dock panel.
     */
    dock?: ISplitArea | ITabArea | null;
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

  /**
   * The restorable description of a tab area in the user interface.
   */
  export
  interface ITabArea extends JSONObject {
    /**
     * The type indicator of the serialized tab area.
     */
    type: 'tab-area';

    /**
     * The widgets in the tab area.
     */
    widgets: Array<string> | null;

    /**
     * The index of the selected tab.
     */
    currentIndex: number;
  }

  /**
   * The restorable description of a split area in the user interface.
   */
  export
  interface ISplitArea extends JSONObject {
    /**
     * The type indicator of the serialized split area.
     */
    type: 'split-area';

    /**
     * The orientation of the split area.
     */
    orientation: 'horizontal' | 'vertical';

    /**
     * The children in the split area.
     */
    children: Array<ITabArea | ISplitArea> | null;

    /**
     * The sizes of the children.
     */
    sizes: Array<number>;
  }

  /**
   * An attached property for a widget's ID in the state database.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({
    name: 'name',
    create: owner => ''
  });

  /**
   * Serialize individual areas within the main area.
   */
  function serializeArea(area: ApplicationShell.AreaConfig): ITabArea | ISplitArea | null {
    if (!area || !area.type) {
      return null;
    }

    if (area.type === 'tab-area') {
      return {
        type: 'tab-area',
        currentIndex: area.currentIndex,
        widgets: area.widgets
          .map(widget => nameProperty.get(widget))
          .filter(name => !!name)
      };
    }

    return {
      type: 'split-area',
      orientation: area.orientation,
      sizes: area.sizes,
      children: area.children.map(serializeArea)
    };
  }

  /**
   * Return a dehydrated, serializable version of the main dock panel.
   */
  export
  function serializeMain(area: ApplicationShell.IMainArea): IMainArea {
    let dehydrated: IMainArea = {
      dock: area && area.dock && serializeArea(area.dock.main) || null
    };
    if (area.currentWidget) {
      let current = Private.nameProperty.get(area.currentWidget);
      if (current) {
        dehydrated.current = current;
      }
    }
    return dehydrated;
  }

  /**
   * Deserialize individual areas within the main area.
   */
  function deserializeArea(area: ITabArea | ISplitArea, widgets: Map<string, Widget>): ApplicationShell.AreaConfig {
    if (!area || !area.type) {
      return null;
    }

    // Because this data is saved to a foreign data source, its type safety is
    // not guaranteed when it is retrieved, so exhaustive checks are necessary.
    if (area.type !== 'tab-area' && area.type !== 'split-area') {
      const type = (area as any).type as string || 'unknown';
      console.warn(`Attempted to deserialize unknown type: ${type}`);
      return null;
    }

    if (area.type === 'tab-area') {
      let hydrated = {
        type: 'tab-area' as 'tab-area',
        currentIndex: area.currentIndex || 0,
        widgets: area.widgets &&
          area.widgets.map(widget => widgets.get(widget))
            .filter(widget => !!widget) || []
      };
      // Make sure the current index is within bounds.
      if (hydrated.currentIndex > hydrated.widgets.length - 1) {
        hydrated.currentIndex = 0;
      }
      return hydrated;
    }

    let hydrated = {
      type: 'split-area' as 'split-area',
      orientation: area.orientation,
      sizes: area.sizes,
      children: area.children &&
        area.children.map(child => deserializeArea(child, widgets))
          .filter(widget => !!widget) || []
    };
    return hydrated;
  }

  /**
   * Return the hydrated version of the main dock panel, ready to restore.
   */
  export
  function deserializeMain(area: IMainArea, widgets: Map<string, Widget>): ApplicationShell.IMainArea {
    const name = area.current || null;
    return {
      currentWidget: name && widgets.has(name) && widgets.get(name) || null,
      dock: { main: deserializeArea(area.dock, widgets) }
    };
  }
}
