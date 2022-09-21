// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTools, NotebookTools } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { IFormWidgetRegistry } from '@jupyterlab/ui-components';
import {
  JSONExt,
  PartialJSONArray,
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { SingletonLayout, Widget } from '@lumino/widgets';

import { IMetadataForm, IMetadataFormProvider } from './token';
import { FormWidget, MetadataForm } from './form';

export { IMetadataForm, IMetadataFormProvider };

const PLUGIN_ID = '@jupyterlab/metadataform-extension:metadataforms';

const UI_SCHEMA_PATTERN = /^ui\:.*/;

/**
 * A class that create a metadata form widget
 */
export class MetadataFormWidget extends NotebookTools.Tool {
  /**
   * Construct an empty widget.
   */
  constructor(
    builtProperties: MetadataForm.IProperties,
    metaInformation: MetadataForm.IMetaInformation,
    uiSchema: MetadataForm.IUiSchema,
    pluginId?: string,
    translator?: ITranslator
  ) {
    super();

    this._properties = builtProperties;
    this._metaInformation = metaInformation;
    this._uiSchema = uiSchema;
    this._pluginId = pluginId;
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._updatingMetadata = false;
    const layout = (this.layout = new SingletonLayout());

    const node = document.createElement('div');
    const content = document.createElement('div');
    content.textContent = this._trans.__('No metadata.');
    content.className = 'jp-MetadataForm-placeholderContent';
    node.appendChild(content);
    this._placeholder = new Widget({ node });
    this._placeholder.addClass('jp-MetadataForm-placeholder');
    layout.widget = this._placeholder;
  }

  /**
   * Set the content of the widget.
   */
  protected setContent(content: Widget | null): void {
    const layout = this.layout as SingletonLayout;
    if (layout.widget) {
      layout.widget.removeClass('jp-MetadataForm-content');
      layout.removeWidget(layout.widget);
    }
    if (!content) {
      content = this._placeholder;
    }
    content.addClass('jp-MetadataForm-content');
    layout.widget = content;
  }

  /**
   * Build widget
   */
  buildWidget(props: MetadataForm.IProps): void {
    const formWidget = new FormWidget(props, this._pluginId);
    formWidget.addClass('jp-MetadataForm');
    this.setContent(formWidget);
  }

  /**
   * Update the form when the widget is displayed.
   */
  protected onAfterShow(msg: Message): void {
    this._update();
  }

  /**
   * Handle a change to the active cell.
   */
  protected onActiveCellChanged(msg: Message): void {
    if (this.isVisible) this._update();
  }

  /**
   * Handle a change to the active cell metadata.
   */
  protected onActiveCellMetadataChanged(msg: Message): void {
    if (!this._updatingMetadata && this.isVisible) this._update();
  }

  /**
   * Update the form with current cell metadata, and remove inconsistent fields.
   */
  private _update(): void {
    const cell = this.notebookTools.activeCell;

    if (cell == undefined) return;

    const builtProperties: MetadataForm.IProperties = {
      type: 'object',
      properties: {}
    };
    const formData = {} as PartialJSONObject;

    for (let [key, metaInfo] of Object.entries(this._metaInformation)) {
      if (
        metaInfo.cellTypes &&
        !metaInfo.cellTypes?.includes(cell.model.type)
      ) {
        continue;
      }

      let nestedKeys = metaInfo.metadataKey;
      builtProperties.properties[key] = this._properties.properties[key];
      let workingObject: PartialJSONObject = cell.model.metadata.toJSON();
      let hasValue = true;
      // Navigate to the value
      for (let nested of nestedKeys.slice(0, -1)) {
        if (nested in workingObject)
          workingObject = workingObject[nested] as PartialJSONObject;
        else {
          hasValue = false;
          break;
        }
      }

      // Fill the formData with the current metadata value
      if (hasValue)
        formData[key] = workingObject[nestedKeys[nestedKeys.length - 1]];
    }

    this.buildWidget({
      properties: builtProperties,
      metaInformation: this._metaInformation,
      uiSchema: this._uiSchema,
      translator: this.translator || null,
      formData: formData,
      parent: this
    });
  }

  /**
   * Update the metadata of the current cell.
   * @param formData: the cell metadata set in the form.
   *
   * Metadata are updated from root only. If some metadata is nested,
   * the whole root object must be updated.
   * This function build an object with all the root object to update
   * in metadata before performing update.
   */
  public updateMetadata(
    metaInformation: MetadataForm.IMetaInformation,
    formData: ReadonlyPartialJSONObject
  ) {
    if (this.notebookTools == undefined) return;

    const cell = this.notebookTools.activeCell;
    if (cell == undefined) return;

    this._updatingMetadata = true;

    // Build the object of metadata to modify.
    const metadataObject: {
      [metadata: string]: PartialJSONObject | PartialJSONValue | undefined;
    } = {};

    for (let [key, value] of Object.entries(formData)) {
      let metadataKey = metaInformation[key].metadataKey;
      let baseMetadataKey = metadataKey[0];
      if (baseMetadataKey == undefined) continue;

      let writeFinalData =
        value !== undefined && value !== metaInformation[key].default;

      // If metadata key is at root of metadata no need to go further.
      if (metaInformation[key].metadataKey.length == 1) {
        if (writeFinalData)
          metadataObject[baseMetadataKey] = value as PartialJSONValue;
        else metadataObject[baseMetadataKey] = undefined;
        continue;
      }

      let intermediateMetadataKeys = metadataKey.slice(1, -1);
      let finalMetadataKey = metadataKey[metadataKey.length - 1];

      // Deep copy of the metadata if not already done.
      if (!(baseMetadataKey in metadataObject))
        metadataObject[baseMetadataKey] = cell.model.metadata.toJSON()[
          baseMetadataKey
        ] as PartialJSONObject;

      if (metadataObject[baseMetadataKey] === undefined)
        metadataObject[baseMetadataKey] = {};

      // Let's have an object which points to the nested key.
      let workingObject: PartialJSONObject = metadataObject[
        baseMetadataKey
      ] as PartialJSONObject;

      let finalObjectReached = true;

      for (let nested of intermediateMetadataKeys) {
        // If one of the nested object does not exist, this object is created only
        // if the aim is to write data at the end.
        if (!(nested in workingObject)) {
          if (!writeFinalData) {
            finalObjectReached = false;
            break;
          } else workingObject[nested] = {};
        }
        workingObject = workingObject[nested] as PartialJSONObject;
      }

      // Write the value to the nested key or remove all empty object before the nested key,
      // only if the final object has been reached.
      if (finalObjectReached) {
        if (!writeFinalData) delete workingObject[finalMetadataKey];
        else workingObject[finalMetadataKey] = value as PartialJSONValue;
      }

      // If the final nested data has been deleted, let see if there is not remaining
      // empty objects to remove.
      if (!writeFinalData) {
        metadataObject[baseMetadataKey] = Private.deleteEmptyNested(
          metadataObject[baseMetadataKey] as PartialJSONObject,
          metadataKey.slice(1)
        );
        if (
          !Object.keys(metadataObject[baseMetadataKey] as PartialJSONObject)
            .length
        )
          metadataObject[baseMetadataKey] = undefined;
      }
    }

    // Set the metadata or delete it if value is undefined or empty object.
    for (let [key, value] of Object.entries(metadataObject)) {
      if (value === undefined) cell.model.metadata.delete(key);
      else cell.model.metadata.set(key, value as ReadonlyPartialJSONValue);
    }
    this._updatingMetadata = false;
  }

  protected translator: ITranslator;
  private _properties: MetadataForm.IProperties;
  private _metaInformation: MetadataForm.IMetaInformation;
  private _uiSchema: MetadataForm.IUiSchema;
  private _trans: TranslationBundle;
  private _placeholder: Widget;
  private _updatingMetadata: boolean;
  private _pluginId: string | undefined;
}

namespace Private {
  export async function loadSettingsMetadataForm(
    app: JupyterFrontEnd,
    tools: MetadataFormWidget[],
    registry: ISettingRegistry,
    notebookTools: INotebookTools,
    translator: ITranslator,
    formWidgetsRegistry: IFormWidgetRegistry
  ): Promise<void> {
    let canonical: ISettingRegistry.ISchema | null;
    let loaded: { [name: string]: ISettingRegistry.IMetadataForm[] } = {};

    /**
     * Populate the plugin's schema defaults.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};
      schema.properties!.metadataforms.default = Object.keys(registry.plugins)
        .map(plugin => {
          const metadataForms =
            registry.plugins[plugin]!.schema['jupyter.lab.metadataforms'] ?? [];

          metadataForms.forEach(metadataForm => {
            metadataForm._origin = plugin;
          });
          loaded[plugin] = metadataForms;
          return metadataForms;
        })
        .concat([schema['jupyter.lab.metadataforms'] as any[]])
        .reduce((acc, val) => {
          return acc.concat(val);
        }, []); // flatten one level;
    }

    // Transform the plugin object to return different schema than the default.
    registry.transform(PLUGIN_ID, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults =
          (canonical.properties?.metadataforms?.default as PartialJSONArray) ??
          [];

        const user = {
          metadataforms: plugin.data.user.metadataforms ?? []
        };
        const composite = {
          metadataforms: defaults.concat(user.metadataforms)
        };

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

    const settings = await registry.load(PLUGIN_ID);

    // Creates all the forms from extensions settings.
    for (let schema of settings.composite
      .metadataforms as ISettingRegistry.IMetadataForm[]) {
      let builtProperties: MetadataForm.IProperties = {
        type: 'object',
        properties: {}
      };
      let metaInformation: MetadataForm.IMetaInformation = {};
      let uiSchema: MetadataForm.IUiSchema = {};

      for (let metadataSchema of schema.metadataKeys) {
        // Name of the key in RJSF schema.
        const joinedMetadataKey = metadataSchema.metadataKey.join('.');

        // Links the key to the path of the data in metadata.
        metaInformation[joinedMetadataKey] = {
          metadataKey: metadataSchema.metadataKey
        };

        // Links the key to its singular property.
        builtProperties.properties[joinedMetadataKey] =
          metadataSchema.properties;

        // Set the default value.
        metaInformation[joinedMetadataKey].default =
          metadataSchema.properties.default;

        // Initialize an uiSchema for that key.
        uiSchema[joinedMetadataKey] = {};

        // Get all ui:schema properties from the JSON file.
        for (let key in metadataSchema) {
          if (UI_SCHEMA_PATTERN.test(key))
            uiSchema[joinedMetadataKey][key] = metadataSchema[key];
        }

        // Optionally links key to a custom widget.
        if (metadataSchema['customWidget']) {
          const formWidget = formWidgetsRegistry.getFormWidgets(
            metadataSchema['customWidget'] as string
          );

          // If renderer is defined (custom widget has been registered), set it as used widget.
          if (formWidget !== undefined)
            uiSchema[joinedMetadataKey]['ui:widget'] = formWidget.renderer;
        }

        // Optionally links key to cell type.
        if (metadataSchema['cellTypes']) {
          metaInformation[joinedMetadataKey].cellTypes =
            metadataSchema['cellTypes'];
        }
      }

      // Adds a section to notebookTools.
      notebookTools.addSection({
        sectionName: schema.label,
        rank: schema.rank,
        label: schema.label
      });

      // Creates the tool.
      const tool = new MetadataFormWidget(
        builtProperties,
        metaInformation,
        uiSchema,
        schema._origin,
        translator
      );

      // Adds the form to the section.
      notebookTools.addItem({ section: schema.label, tool: tool });

      tools.push(tool);
    }
  }

  /**
   * Recursive function to clean the empty nested metadata before updating real metadata.
   * this function is called when a nested metadata is undefined (or default), so maybe some
   * object are now empty.
   * @param metadataObject: PartialJSONObject representing the metadata to update.
   * @param metadataKeysList: Array<string> of the undefined nested metadata.
   * @returns PartialJSONObject without empty object.
   */
  export function deleteEmptyNested(
    metadataObject: PartialJSONObject,
    metadataKeysList: Array<string>
  ): PartialJSONObject {
    let metadataKey = metadataKeysList.shift();
    if (metadataKey !== undefined && metadataKey in metadataObject) {
      if (Object.keys(metadataObject[metadataKey] as PartialJSONObject).length)
        metadataObject[metadataKey] = deleteEmptyNested(
          metadataObject[metadataKey] as PartialJSONObject,
          metadataKeysList
        );
      if (!Object.keys(metadataObject[metadataKey] as PartialJSONObject).length)
        delete metadataObject[metadataKey];
    }
    return metadataObject;
  }
}

/**
 * The metadata form plugin.
 */
const metadataForm: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [INotebookTools, ITranslator, IFormWidgetRegistry],
  optional: [ISettingRegistry],
  provides: IMetadataFormProvider,
  activate: async (
    app: JupyterFrontEnd,
    notebookTools: INotebookTools,
    translator: ITranslator,
    editorRegistry: IFormWidgetRegistry,
    settings: ISettingRegistry | null
  ) => {
    console.log('Activating Metadata form');
    let tools: MetadataFormWidget[] = [];

    if (settings) {
      await Private.loadSettingsMetadataForm(
        app,
        tools,
        settings,
        notebookTools,
        translator,
        editorRegistry
      );
    }

    console.log('Metadata form activated');
  }
};

export default metadataForm;
