import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { toArray } from '@lumino/algorithm';
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
  let canonical: ISettingRegistry.ISchema | null;
  let loaded: { [name: string]: ISettingRegistry.IToolbarItem[] } = {};

  /**
   * Populate the plugin's schema defaults.
   *
   * We keep track of disabled entries in case the plugin is loaded
   * after the toolbar initialization.
   */
  function populate(schema: ISettingRegistry.ISchema) {
    loaded = {};
    const pluginDefaults = Object.keys(registry.plugins)
      .map(plugin => {
        const items =
          (registry.plugins[plugin]!.schema['jupyter.lab.toolbars'] ?? {})[
            factoryName
          ] ?? [];
        loaded[plugin] = items;
        return items;
      })
      .concat([(schema['jupyter.lab.toolbars'] ?? {})[factoryName] ?? []])
      .reduceRight(
        (
          acc: ISettingRegistry.IToolbarItem[],
          val: ISettingRegistry.IToolbarItem[]
        ) => SettingRegistry.reconcileToolbarItems(acc, val, true),
        []
      )!;

    // Apply default value as last step to take into account overrides.json
    // The standard default being [] as the plugin must use `jupyter.lab.toolbars.<factory>`
    // to define their default value.
    schema.properties![
      propertyId
    ].default = SettingRegistry.reconcileToolbarItems(
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
        (plugin.data.user[propertyId] as ISettingRegistry.IToolbarItem[]) ?? [];
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

  // Repopulate the canonical variable after the setting registry has
  // preloaded all initial plugins.
  canonical = null;

  const settings = await registry.load(pluginId);

  // React to customization by the user
  settings.changed.connect(() => {
    const newItems: ISettingRegistry.IToolbarItem[] =
      (settings.composite[propertyId] as any) ?? [];

    transferSettings(newItems);
  });

  // React to plugin changes
  registry.pluginChanged.connect(async (sender, plugin) => {
    // As the plugin storing the toolbar definition is transformed using
    // the above definition, if it changes, this means that a request to
    // reloaded was triggered. Hence the toolbar definitions from the other
    // plugins has been automatically reset during the transform step.
    if (plugin !== pluginId) {
      // If a plugin changed its toolbar items
      const oldItems = loaded[plugin] ?? [];
      const newItems =
        (registry.plugins[plugin]!.schema['jupyter.lab.toolbars'] ?? {})[
          factoryName
        ] ?? [];
      if (!JSONExt.deepEqual(oldItems, newItems)) {
        if (loaded[plugin]) {
          // The plugin has changed, request the user to reload the UI
          await displayInformation(trans);
        } else {
          // The plugin was not yet loaded => update the toolbar items list
          loaded[plugin] = JSONExt.deepCopy(newItems);
          const newList = (
            SettingRegistry.reconcileToolbarItems(
              toArray(toolbarItems),
              newItems,
              false
            ) ?? []
          ).sort(
            (a, b) =>
              (a.rank ?? DEFAULT_TOOLBAR_ITEM_RANK) -
              (b.rank ?? DEFAULT_TOOLBAR_ITEM_RANK)
          );
          transferSettings(newList);
        }
      }
    }
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
 * @returns List of toolbar widgets
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
      }
    };

    const toolbar = new ObservableList<ToolbarRegistry.IToolbarItem>({
      values: toArray(items).map(item => {
        return {
          name: item.name,
          widget: toolbarRegistry.createWidget(factoryName, widget, item)
        };
      })
    });

    items.changed.connect(updateToolbar);
    widget.disposed.connect(() => {
      items.changed.disconnect(updateToolbar);
    });

    return toolbar;
  };
}
