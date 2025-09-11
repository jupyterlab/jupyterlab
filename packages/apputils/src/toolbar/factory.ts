/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { Toolbar } from '@jupyterlab/ui-components';
import { findIndex } from '@lumino/algorithm';
import { JSONExt, PartialJSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { Dialog, showDialog } from '../dialog';
import { IToolbarWidgetRegistry, ToolbarRegistry } from '../tokens';

/**
 * Default toolbar item rank
 *
 * #### Notes
 * This will place item just before the white spacer item in the notebook toolbar.
 */
const DEFAULT_TOOLBAR_ITEM_RANK = 50;

const TOOLBAR_KEY = 'jupyter.lab.toolbars';

/**
 * Display warning when the toolbar definition have been modified.
 *
 * @param trans Translation bundle
 */
async function displayInformation(trans: TranslationBundle): Promise<void> {
  const result = await showDialog({
    title: trans.__('Information'),
    body: trans.__(
      'Toolbar customization has changed. You will need to reload JupyterLab to see the changes.'
    ),
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({ label: trans.__('Reload') })
    ]
  });

  if (result.button.accept) {
    location.reload();
  }
}

/**
 * Set the toolbar definition by accumulating all settings definition.
 *
 * The list will be populated only with the enabled items.
 *
 * @param toolbarItems Observable list to populate
 * @param registry Application settings registry
 * @param factoryName Widget factory name that needs a toolbar
 * @param pluginId Settings plugin id
 * @param translator Translator object
 * @param propertyId Property holding the toolbar definition in the settings; default 'toolbar'
 * @returns List of toolbar items
 */
async function setToolbarItems(
  toolbarItems: IObservableList<ISettingRegistry.IToolbarItem>,
  registry: ISettingRegistry,
  factoryName: string,
  pluginId: string,
  translator: ITranslator,
  propertyId: string = 'toolbar'
): Promise<void> {
  const trans = translator.load('jupyterlab');

  let canonical: ISettingRegistry.ISchema | null = null;
  let loaded: { [name: string]: ISettingRegistry.IToolbarItem[] } = {};
  let listenPlugin = true;

  try {
    /**
     * Populate the plugin's schema defaults.
     *
     * We keep track of disabled entries in case the plugin is loaded
     * after the toolbar initialization.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};

      const pluginDefaults = Object.keys(registry.plugins)
        // Filter out the current plugin (will be listed when reloading)
        // because we control its addition after the mapping step
        .filter(plugin => plugin !== pluginId)
        .map(plugin => {
          const items =
            (registry.plugins[plugin]!.schema[TOOLBAR_KEY] ?? {})[
              factoryName
            ] ?? [];
          loaded[plugin] = items;
          return items;
        })
        .concat([(schema[TOOLBAR_KEY] ?? {})[factoryName] ?? []])
        .reduceRight(
          (acc, val) => SettingRegistry.reconcileToolbarItems(acc, val, true),
          []
        )!;

      // Apply default value as last step to take into account overrides.json
      // The standard toolbars default is [] as the plugin must use
      // `jupyter.lab.toolbars.<factory>` to define its default value.
      schema.properties![propertyId].default =
        SettingRegistry.reconcileToolbarItems(
          pluginDefaults,
          schema.properties![propertyId].default as any[],
          true
        )!.sort(
          (a, b) =>
            (a.rank ?? DEFAULT_TOOLBAR_ITEM_RANK) -
            (b.rank ?? DEFAULT_TOOLBAR_ITEM_RANK)
        );
    }

    // Transform the plugin object to return different schema than the default.
    registry.transform(pluginId, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults =
          ((canonical.properties ?? {})[propertyId] ?? {}).default ?? [];
        // Initialize the settings
        const user: PartialJSONObject = plugin.data.user;
        const composite: PartialJSONObject = plugin.data.composite;
        // Overrides the value with using the aggregated default for the toolbar property
        user[propertyId] =
          (plugin.data.user[propertyId] as ISettingRegistry.IToolbarItem[]) ??
          [];
        composite[propertyId] = (
          SettingRegistry.reconcileToolbarItems(
            defaults as ISettingRegistry.IToolbarItem[],
            user[propertyId] as ISettingRegistry.IToolbarItem[],
            false
          ) ?? []
        ).sort(
          (a, b) =>
            (a.rank ?? DEFAULT_TOOLBAR_ITEM_RANK) -
            (b.rank ?? DEFAULT_TOOLBAR_ITEM_RANK)
        );

        plugin.data = { composite, user };

        return plugin;
      },
      fetch: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        return {
          data: plugin.data,
          id: plugin.id,
          raw: plugin.raw,
          schema: canonical,
          version: plugin.version
        };
      }
    });
  } catch (error) {
    if (error.name === 'TransformError') {
      // Assume the existing transformer is the toolbar builder transformer
      // from another factory set up.
      listenPlugin = false;
    } else {
      throw error;
    }
  }

  // Repopulate the canonical variable after the setting registry has
  // preloaded all initial plugins.
  const settings = await registry.load(pluginId);

  // React to customization by the user
  settings.changed.connect(() => {
    const newItems: ISettingRegistry.IToolbarItem[] =
      (settings.composite[propertyId] as any) ?? [];

    transferSettings(newItems);
  });

  const transferSettings = (newItems: ISettingRegistry.IToolbarItem[]) => {
    // This is not optimal but safer because a toolbar item with the same
    // name cannot be inserted (it will be a no-op). But that could happen
    // if the settings are changing the items order.
    toolbarItems.clear();
    toolbarItems.pushAll(newItems.filter(item => !item.disabled));
  };

  // Initialize the toolbar
  transferSettings((settings.composite[propertyId] as any) ?? []);

  // React to plugin changes if no other transformer exists, otherwise bail.
  if (!listenPlugin) {
    return;
  }
  registry.pluginChanged.connect(async (sender, plugin) => {
    // Since the plugin storing the toolbar definition is transformed above,
    // if it has changed, it means that a request to reload was triggered.
    // Hence the toolbar definitions from the other plugins have been
    // automatically reset during the transform step.
    if (plugin === pluginId) {
      return;
    }
    // If a plugin changed its toolbar items
    const oldItems = loaded[plugin] ?? [];
    const newItems =
      (registry.plugins[plugin]!.schema[TOOLBAR_KEY] ?? {})[factoryName] ?? [];
    if (!JSONExt.deepEqual(oldItems, newItems)) {
      if (loaded[plugin]) {
        // The plugin has changed, request the user to reload the UI
        await displayInformation(trans);
      } else {
        if (newItems.length > 0) {
          // Empty the default values to avoid toolbar settings collisions.
          canonical = null;
          const schema = registry.plugins[pluginId]!.schema;
          schema.properties!.toolbar.default = [];

          // Run again the transformations.
          await registry.load(pluginId, true);
        }
      }
    }
  });
}

/**
 * Create the toolbar factory for a given container widget based
 * on a data description stored in settings
 *
 * @param toolbarRegistry Toolbar widgets registry
 * @param settingsRegistry Settings registry
 * @param factoryName Toolbar container factory name
 * @param pluginId Settings plugin id
 * @param translator Translator
 * @param propertyId Toolbar definition key in the settings plugin
 * @returns List of toolbar widgets factory
 */
export function createToolbarFactory(
  toolbarRegistry: IToolbarWidgetRegistry,
  settingsRegistry: ISettingRegistry,
  factoryName: string,
  pluginId: string,
  translator: ITranslator,
  propertyId: string = 'toolbar'
): (widget: Widget) => IObservableList<ToolbarRegistry.IToolbarItem> {
  const items = new ObservableList<ISettingRegistry.IToolbarItem>({
    itemCmp: (a, b) => JSONExt.deepEqual(a as any, b as any)
  });

  // Get toolbar definition from the settings
  setToolbarItems(
    items,
    settingsRegistry,
    factoryName,
    pluginId,
    translator,
    propertyId
  ).catch(reason => {
    console.error(
      `Failed to load toolbar items for factory ${factoryName} from ${pluginId}`,
      reason
    );
  });

  return (widget: Widget) => {
    const updateToolbar = (
      list: IObservableList<ToolbarRegistry.IWidget>,
      change: IObservableList.IChangedArgs<ToolbarRegistry.IWidget>
    ) => {
      switch (change.type) {
        case 'move':
          toolbar.move(change.oldIndex, change.newIndex);
          break;
        case 'add':
          change.newValues.forEach(item =>
            toolbar.push({
              name: item.name,
              widget: toolbarRegistry.createWidget(factoryName, widget, item)
            })
          );
          break;
        case 'remove':
          change.oldValues.forEach(() => toolbar.remove(change.oldIndex));
          break;
        case 'set':
          change.newValues.forEach(item =>
            toolbar.set(change.newIndex, {
              name: item.name,
              widget: toolbarRegistry.createWidget(factoryName, widget, item)
            })
          );
          break;
        case 'clear':
          change.oldValues.forEach(() => toolbar.remove(change.oldIndex));
          break;
      }
    };

    const updateWidget = (
      registry: IToolbarWidgetRegistry,
      itemName: string
    ) => {
      const itemIndex = Array.from(items).findIndex(
        item => item.name === itemName
      );
      if (itemIndex >= 0) {
        toolbar.set(itemIndex, {
          name: itemName,
          widget: toolbarRegistry.createWidget(
            factoryName,
            widget,
            items.get(itemIndex)
          )
        });
      }
    };

    const toolbar = new ObservableList<ToolbarRegistry.IToolbarItem>({
      values: Array.from(items).map(item => {
        return {
          name: item.name,
          widget: toolbarRegistry.createWidget(factoryName, widget, item)
        };
      })
    });

    // Re-render the widget if a new factory has been added.
    toolbarRegistry.factoryAdded.connect(updateWidget);

    items.changed.connect(updateToolbar);

    widget.disposed.connect(() => {
      items.changed.disconnect(updateToolbar);
      toolbarRegistry.factoryAdded.disconnect(updateWidget);
    });

    return toolbar;
  };
}

/**
 * Set the toolbar items of a widget from a factory
 *
 * @param widget Widget with the toolbar to set
 * @param factory Toolbar items factory
 * @param toolbar Separated toolbar if widget is a raw widget
 */
export function setToolbar(
  widget: Toolbar.IWidgetToolbar | Widget,
  factory: (
    widget: Widget
  ) =>
    | IObservableList<ToolbarRegistry.IToolbarItem>
    | ToolbarRegistry.IToolbarItem[],
  toolbar?: Toolbar
): void {
  // @ts-expect-error Widget has no toolbar
  if (!widget.toolbar && !toolbar) {
    console.log(
      `Widget ${widget.id} has no 'toolbar' and no explicit toolbar was provided.`
    );
    return;
  }

  // @ts-expect-error Widget has no toolbar
  const toolbar_ = (widget.toolbar as Toolbar) ?? toolbar;

  const items = factory(widget);

  if (Array.isArray(items)) {
    items.forEach(({ name, widget: item }) => {
      toolbar_.addItem(name, item);
    });
  } else {
    const updateToolbar = (
      list: IObservableList<ToolbarRegistry.IToolbarItem>,
      changes: IObservableList.IChangedArgs<ToolbarRegistry.IToolbarItem>
    ) => {
      switch (changes.type) {
        case 'add':
          changes.newValues.forEach((item, index) => {
            toolbar_.insertItem(
              changes.newIndex + index,
              item.name,
              item.widget
            );
          });
          break;
        case 'move':
          changes.oldValues.forEach(item => {
            item.widget.parent = null;
          });
          changes.newValues.forEach((item, index) => {
            toolbar_.insertItem(
              changes.newIndex + index,
              item.name,
              item.widget
            );
          });
          break;
        case 'remove':
          changes.oldValues.forEach(item => {
            item.widget.parent = null;
          });
          break;
        case 'set':
          changes.oldValues.forEach(item => {
            item.widget.parent = null;
          });

          changes.newValues.forEach((item, index) => {
            const existingIndex = findIndex(
              toolbar_.names(),
              name => item.name === name
            );
            if (existingIndex >= 0) {
              Array.from(toolbar_.children())[existingIndex].parent = null;
            }

            toolbar_.insertItem(
              changes.newIndex + index,
              item.name,
              item.widget
            );
          });
          break;
        case 'clear':
          Array.from(toolbar_.children()).forEach(child => {
            child.parent = null;
          });
          break;
      }
    };

    updateToolbar(items, {
      newIndex: 0,
      newValues: Array.from(items),
      oldIndex: 0,
      oldValues: [],
      type: 'add'
    });

    items.changed.connect(updateToolbar);
    widget.disposed.connect(() => {
      items.changed.disconnect(updateToolbar);
    });
  }
}
