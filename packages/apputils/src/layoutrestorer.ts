/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JSONObject, PromiseDelegate, Token
} from '@phosphor/coreutils';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  Widget
} from '@phosphor/widgets';

import {
  ApplicationShell
} from '@jupyterlab/application';

import {
  InstanceTracker, IStateDB
} from './';


/* tslint:disable */
/**
 * The layout restorer token.
 */
export
const ILayoutRestorer = new Token<ILayoutRestorer>('jupyter.services.layout-restorer');
/* tslint:enable */


/**
 * A static class that restores the widgets of the application when it reloads.
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
  add(widget: Widget, name: string): void;

  /**
   * Restore the widgets of a particular instance tracker.
   *
   * @param tracker - The instance tracker whose widgets will be restored.
   *
   * @param options - The restoration options.
   */
  restore(tracker: InstanceTracker<any>, options: ILayoutRestorer.IRestoreOptions<any>): void;
}


/**
 * A namespace for the layout restorer.
 */
export
namespace ILayoutRestorer {
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
const KEY = 'layout-restorer:data';


/**
 * The default implementation of a layout restorer.
 *
 * #### Notes
 * The lifecycle for state restoration is subtle. The sequence of events is:
 *
 * 1. The layout restorer plugin is instantiated. It installs itself as the
 *    layout database that the application shell can use to `fetch` and `save`
 *    layout restoration data.
 *
 * 2. Other plugins that care about state restoration require the layout
 *    restorer as a dependency.
 *
 * 3. As each load-time plugin initializes (which happens before the lab
 *    application has `started`), it instructs the layout restorer whether
 *    the restorer ought to `restore` its state by passing in its tracker.
 *    Alternatively, a plugin that does not require its own instance tracker
 *    (because perhaps it only creates a single widget, like a command palette),
 *    can simply `add` its widget along with a persistent unique name to the
 *    layout restorer so that its layout state can be restored when the lab
 *    application restores.
 *
 * 4. After all the load-time plugins have finished initializing, the lab
 *    application `started` promise will resolve. This is the `first`
 *    promise that the layout restorer waits for. By this point, all of the
 *    plugins that care about restoration will have instructed the layout
 *    restorer to `restore` their state.
 *
 * 5. The layout restorer will then instruct each plugin's instance tracker
 *    to restore its state and reinstantiate whichever widgets it wants. The
 *    tracker returns a promise to the layout restorer that resolves when it
 *    has completed restoring the tracked widgets it cares about.
 *
 * 6. As each instance tracker finishes restoring the widget instances it cares
 *    about, it resolves the promise that was made to the layout restorer
 *    (in step 5). After all of the promises that the restorer is awaiting have
 *    resolved, the restorer then resolves its `restored` promise allowing the
 *    application shell to `fetch` the dehydrated layout state and rehydrate the
 *    saved layout.
 *
 * Of particular note are steps 5 and 6: since state restoration of plugins
 * is accomplished by executing commands, the command that is used to restore
 * the state of each plugin must return a promise that only resolves when the
 * widget has been created and added to the plugin's instance tracker.
 */
export
class LayoutRestorer implements ILayoutRestorer {
  /**
   * Create a layout restorer.
   */
  constructor(options: LayoutRestorer.IOptions) {
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
   * A promise resolved when the layout restorer is ready to receive signals.
   */
  get restored(): Promise<void> {
    return this._restored.promise;
  }

  /**
   * Add a widget to be tracked by the layout restorer.
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
      fresh: true, mainArea: null, leftArea: null, rightArea: null
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
  restore(tracker: InstanceTracker<Widget>, options: ILayoutRestorer.IRestoreOptions<Widget>): Promise<any> {
    if (!this._promises) {
      const warning = 'restore() can only be called before `first` has resolved.';
      console.warn(warning);
      return Promise.reject(warning);
    }

    const { namespace } = tracker;
    if (this._trackers.has(namespace)) {
      let warning = `A tracker namespaced ${namespace} was already restored.`;
      console.warn(warning);
      return Promise.reject(warning);
    }

    const { args, command, name, when } = options;

    // Add the tracker to the private trackers collection.
    this._trackers.add(namespace);

    // Whenever a new widget is added to the tracker, record its name.
    tracker.widgetAdded.connect((sender: any, widget: Widget) => {
      const widgetName = name(widget);
      if (widgetName) {
        this.add(widget, widgetName);
      }
    }, this);

    const first = this._first;
    const promise = tracker.restore({
      args, command, name,
      registry: this._registry,
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
    if (area && area.currentWidget) {
      let current = Private.nameProperty.get(area.currentWidget);
      if (current) {
        dehydrated.current = current;
      }
    }
    return dehydrated;
  }

  /**
   * Deserialize individual areas within the main area.
   *
   * #### Notes
   * Because this data comes from a potentially unreliable foreign source, it is
   * typed as a `JSONObject`; but the actual expected type is:
   * `ITabArea | ISplitArea`.
   *
   * For fault tolerance, types are manually checked in deserialization.
   */
  function deserializeArea(area: JSONObject, names: Map<string, Widget>): ApplicationShell.AreaConfig | null {
    if (!area) {
      return null;
    }

    // Because this data is saved to a foreign data source, its type safety is
    // not guaranteed when it is retrieved, so exhaustive checks are necessary.
    const type = (area as any).type as string || 'unknown';
    if (type === 'unknown' || (type !== 'tab-area' && type !== 'split-area')) {
      console.warn(`Attempted to deserialize unknown type: ${type}`);
      return null;
    }

    if (type === 'tab-area') {
      const { currentIndex, widgets } = area as ITabArea;
      let hydrated: ApplicationShell.AreaConfig = {
        type: 'tab-area',
        currentIndex: currentIndex || 0,
        widgets: widgets && widgets.map(widget => names.get(widget))
            .filter(widget => !!widget) || []
      };

      // Make sure the current index is within bounds.
      if (hydrated.currentIndex > hydrated.widgets.length - 1) {
        hydrated.currentIndex = 0;
      }

      return hydrated;
    }

    const { orientation, sizes, children } = area as ISplitArea;
    let hydrated: ApplicationShell.AreaConfig = {
      type: 'split-area',
      orientation: orientation,
      sizes: sizes || [],
      children: children &&
        children.map(child => deserializeArea(child, names))
           .filter(widget => !!widget) || []
    };

    return hydrated;
  }

  /**
   * Return the hydrated version of the main dock panel, ready to restore.
   *
   * #### Notes
   * Because this data comes from a potentially unreliable foreign source, it is
   * typed as a `JSONObject`; but the actual expected type is: `IMainArea`.
   *
   * For fault tolerance, types are manually checked in deserialization.
   */
  export
  function deserializeMain(area: JSONObject, names: Map<string, Widget>): ApplicationShell.IMainArea | null {
    if (!area) {
      return null;
    }

    const name = (area as any).current || null;
    const dock = (area as any).dock || null;

    return {
      currentWidget: name && names.has(name) && names.get(name) || null,
      dock: dock ? { main: deserializeArea(dock, names) } : null
    };
  }
}
