import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { findIndex, toArray } from '@lumino/algorithm';
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
 * Accumulate the toolbar definition from all settings and set the default value from it.
 *
 * @param registry Application settings registry
 * @param factoryName Widget factory name that needs a toolbar
 * @param pluginId Settings plugin id
 * @param translator Translator object
 * @param propertyId Property holding the toolbar definition in the settings; default 'toolbar'
 * @returns List of toolbar items
 */
async function getToolbarItems(
  registry: ISettingRegistry,
  factoryName: string,
  pluginId: string,
  translator: ITranslator,
  propertyId: string = 'toolbar'
): Promise<IObservableList<ISettingRegistry.IToolbarItem>> {
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
    )!
      // flatten one level
      .sort(
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
      composite[propertyId] =
        SettingRegistry.reconcileToolbarItems(
          defaults as ISettingRegistry.IToolbarItem[],
          user[propertyId] as ISettingRegistry.IToolbarItem[],
          false
        ) ?? [];

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

  const toolbarItems: IObservableList<ISettingRegistry.IToolbarItem> = new ObservableList(
    {
      values: JSONExt.deepCopy(settings.composite[propertyId] as any) ?? [],
      itemCmp: (a, b) => JSONExt.deepEqual(a, b)
    }
  );

  // React to customization by the user
  settings.changed.connect(() => {
    // As extension may change the toolbar through API,
    // prompt the user to reload if the toolbar definition has been updated.
    const newItems = (settings.composite[propertyId] as any) ?? [];
    if (!JSONExt.deepEqual(toArray(toolbarItems.iter()), newItems)) {
      void displayInformation(trans);
    }
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
          const newList =
            SettingRegistry.reconcileToolbarItems(
              toArray(toolbarItems),
              newItems,
              false
            ) ?? [];

          // Existing items cannot be removed.
          newList?.forEach(item => {
            const index = findIndex(
              toolbarItems,
              value => item.name === value.name
            );
            if (index < 0) {
              toolbarItems.push(item);
            } else {
              toolbarItems.set(index, item);
            }
          });
        }
      }
    }
  });

  return toolbarItems;
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
): (widget: Widget) => ToolbarRegistry.IToolbarItem[] {
  const items: ToolbarRegistry.IWidget[] = [];
  let rawItems: IObservableList<ToolbarRegistry.IWidget>;

  const transfer = (
    list: IObservableList<ToolbarRegistry.IWidget>,
    change: IObservableList.IChangedArgs<ToolbarRegistry.IWidget>
  ) => {
    switch (change.type) {
      case 'move':
        break;
      case 'add':
      case 'remove':
      case 'set':
        items.length = 0;
        items.push(
          ...toArray(list)
            .filter(item => !item.disabled)
            .sort(
              (a, b) =>
                (a.rank ?? DEFAULT_TOOLBAR_ITEM_RANK) -
                (b.rank ?? DEFAULT_TOOLBAR_ITEM_RANK)
            )
        );
        break;
    }
  };

  // Get toolbar definition from the settings
  getToolbarItems(
    settingsRegistry,
    factoryName,
    pluginId,
    translator,
    propertyId
  )
    .then(candidates => {
      rawItems = candidates;
      rawItems.changed.connect(transfer);
      // Force initialization of items
      transfer(rawItems, {
        type: 'add',
        newIndex: 0,
        newValues: [],
        oldIndex: 0,
        oldValues: []
      });
    })
    .catch(reason => {
      console.error(
        `Failed to load toolbar items for factory ${factoryName} from ${pluginId}`,
        reason
      );
    });

  return (widget: Widget) =>
    items.map(item => {
      return {
        name: item.name,
        widget: toolbarRegistry.createWidget(factoryName, widget, item)
      };
    });
}
