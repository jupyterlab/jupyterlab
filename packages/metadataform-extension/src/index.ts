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
import { IObservableJSON } from '@jupyterlab/observables';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  IFormComponentRegistry,
  IFormWidgetRegistry
} from '@jupyterlab/ui-components';
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

/**
 * A class that create a metadata form widget
 */
export class MetadataFormWidget
  extends NotebookTools.Tool
  implements IMetadataForm
{
  /**
   * Construct an empty widget.
   */
  constructor(
    metadataSchema: MetadataForm.IMetadataSchema,
    metaInformation: MetadataForm.IMetaInformation,
    uiSchema: MetadataForm.IUiSchema,
    pluginId?: string,
    translator?: ITranslator
  ) {
    super();
    this._metadataSchema = metadataSchema;
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
   * Get the list of existing metadataKey (array of array of string).
   */
  get metadataKeys(): string[] {
    const metadataKeys: string[] = [];
    for (let metadataKey of Object.keys(this._metaInformation)) {
      metadataKeys.push(metadataKey);
    }
    return metadataKeys;
  }

  /**
   * Get the properties of a MetadataKey.
   *
   * @param metadataKey - metadataKey (string).
   */
  getProperties(metadataKey: string): PartialJSONObject | null {
    return (
      JSONExt.deepCopy(this._metadataSchema.properties[metadataKey]) || null
    );
  }

  /**
   * Set properties to a metadataKey.
   *
   * @param metadataKey - metadataKey (string).
   * @param properties - the properties to add or modify.
   */
  setProperties(metadataKey: string, properties: PartialJSONObject): void {
    Object.entries(properties).forEach(([key, value]) => {
      this._metadataSchema.properties[metadataKey][key] = value;
    });
  }

  /**
   * Update the metadata of the current cell or notebook.
   *
   * @param formData - the cell metadata set in the form.
   * @param reload - whether to update the form after updating the metadata.
   *
   * ## Notes
   * Metadata are updated from root only. If some metadata is nested,
   * the whole root object must be updated.
   * This function build an object with all the root object to update
   * in metadata before performing update.
   */
  updateMetadata(formData: ReadonlyPartialJSONObject, reload?: boolean) {
    if (this.notebookTools == undefined) return;

    const notebook = this.notebookTools.activeNotebookPanel;

    const cell = this.notebookTools.activeCell;
    if (cell == null) return;

    this._updatingMetadata = true;

    // An object representing the cell metadata to modify.
    const cellMetadataObject: Private.IMetadataRepresentation = {};

    // An object representing the notebook metadata to modify.
    const notebookMetadataObject: Private.IMetadataRepresentation = {};

    for (let [metadataKey, value] of Object.entries(formData)) {
      if (
        this._metaInformation[metadataKey]?.level === 'notebook' &&
        this._notebookModelNull
      )
        continue;

      let currentMetadata: IObservableJSON;
      let metadataObject: Private.IMetadataRepresentation;

      // Linking the working variable to the corresponding metadata and representation.
      if (this._metaInformation[metadataKey]?.level === 'notebook') {
        // Working on notebook metadata.
        currentMetadata = notebook!.model!.metadata;
        metadataObject = notebookMetadataObject;
      } else {
        // Working on cell metadata.
        currentMetadata = cell.model.metadata;
        metadataObject = cellMetadataObject;
      }

      // Remove first and last '/' if necessary and split the path.
      let nestedKey = metadataKey
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .split('/');

      let baseMetadataKey = nestedKey[0];
      if (baseMetadataKey == undefined) continue;

      let writeFinalData =
        value !== undefined &&
        value !== this._metaInformation[metadataKey]?.default;

      // If metadata key is at root of metadata no need to go further.
      if (nestedKey.length == 1) {
        if (writeFinalData)
          metadataObject[baseMetadataKey] = value as PartialJSONValue;
        else metadataObject[baseMetadataKey] = undefined;
        continue;
      }

      let intermediateMetadataKeys = nestedKey.slice(1, -1);
      let finalMetadataKey = nestedKey[nestedKey.length - 1];

      // Deep copy of the metadata if not already done.
      if (!(baseMetadataKey in metadataObject)) {
        metadataObject[baseMetadataKey] = currentMetadata.toJSON()[
          baseMetadataKey
        ] as PartialJSONObject;
      }
      if (metadataObject[baseMetadataKey] === undefined)
        metadataObject[baseMetadataKey] = {};

      // Let's have an object which points to the nested key.
      let workingObject: PartialJSONObject = metadataObject[
        baseMetadataKey
      ] as PartialJSONObject;

      let finalObjectReached = true;

      for (let nested of intermediateMetadataKeys) {
        // If one of the nested object does not exist, this object is created
        // only if there is a final data to write.
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
          nestedKey.slice(1)
        );
        if (
          !Object.keys(metadataObject[baseMetadataKey] as PartialJSONObject)
            .length
        )
          metadataObject[baseMetadataKey] = undefined;
      }
    }

    // Set the cell metadata or delete it if value is undefined or empty object.
    for (let [key, value] of Object.entries(cellMetadataObject)) {
      if (value === undefined) cell.model.metadata.delete(key);
      else cell.model.metadata.set(key, value as ReadonlyPartialJSONValue);
    }

    // Set the notebook metadata or delete it if value is undefined or empty object.
    if (!this._notebookModelNull) {
      for (let [key, value] of Object.entries(notebookMetadataObject)) {
        if (value === undefined) notebook!.model!.metadata.delete(key);
        else
          notebook!.model!.metadata.set(key, value as ReadonlyPartialJSONValue);
      }
    }

    this._updatingMetadata = false;

    if (reload) {
      this._update();
    }
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
   * Build widget.
   */
  protected buildWidget(props: MetadataForm.IProps): void {
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

  protected onActiveNotebookPanelChanged(msg: Message): void {
    // Do not use notebook metadata if model is null.
    let notebook = this.notebookTools.activeNotebookPanel;
    if (notebook === null || notebook.model === null) {
      console.warn('Notebook model is null, its metadata cannot be updated.');
      this._notebookModelNull = true;
    } else {
      this._notebookModelNull = false;
    }
    if (!this._updatingMetadata && this.isVisible) this._update();
  }

  /**
   * Handle a change to the active notebook metadata.
   */
  protected onActiveNotebookPanelMetadataChanged(msg: Message): void {
    if (!this._updatingMetadata && this.isVisible) this._update();
  }

  /**
   * Update the form with current cell metadata, and remove inconsistent fields.
   */
  private _update(): void {
    const notebook = this.notebookTools.activeNotebookPanel;

    const cell = this.notebookTools.activeCell;
    if (cell == undefined) return;

    const builtProperties: MetadataForm.IMetadataSchema = {
      type: 'object',
      properties: {}
    };
    const formData = {} as PartialJSONObject;

    for (let [metadataKey, properties] of Object.entries(
      this._metadataSchema.properties
    )) {
      // Do not display the field if it's Notebook metadata and the notebook model is null.
      if (
        this._metaInformation[metadataKey]?.level === 'notebook' &&
        this._notebookModelNull
      )
        continue;

      // Do not display the field if the active cell's type is not involved.
      if (
        this._metaInformation[metadataKey]?.cellTypes &&
        !this._metaInformation[metadataKey]?.cellTypes?.includes(
          cell.model.type
        )
      ) {
        continue;
      }

      let workingObject: PartialJSONObject;
      let nestedKeys = metadataKey
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .split('/');
      builtProperties.properties[metadataKey] = properties;

      // Associates the correct metadata to the working object.
      if (this._metaInformation[metadataKey]?.level === 'notebook') {
        workingObject = notebook!.model!.metadata.toJSON();
      } else {
        workingObject = cell.model.metadata.toJSON();
      }

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
        formData[metadataKey] =
          workingObject[nestedKeys[nestedKeys.length - 1]];
    }

    this.buildWidget({
      properties: builtProperties,
      metaInformation: this._metaInformation,
      uiSchema: this._uiSchema,
      translator: this.translator || null,
      formData: formData,
      formWidget: this
    });
  }

  protected translator: ITranslator;
  private _metadataSchema: MetadataForm.IMetadataSchema;
  private _metaInformation: MetadataForm.IMetaInformation;
  private _uiSchema: MetadataForm.IUiSchema;
  private _trans: TranslationBundle;
  private _placeholder: Widget;
  private _updatingMetadata: boolean;
  private _pluginId: string | undefined;
  private _notebookModelNull: boolean = false;
}

namespace Private {
  /**
   * The metadata representation object.
   */
  export interface IMetadataRepresentation {
    [metadata: string]: PartialJSONObject | PartialJSONValue | undefined;
  }

  export async function loadSettingsMetadataForm(
    app: JupyterFrontEnd,
    tools: MetadataFormWidget[],
    registry: ISettingRegistry,
    notebookTools: INotebookTools,
    translator: ITranslator,
    formWidgetsRegistry: IFormWidgetRegistry,
    formComponentRegistry: IFormComponentRegistry
  ): Promise<{ [section: string]: MetadataFormWidget }> {
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
          // If a MetadataForm with the same ID already exists,
          // the metadataKeys will be concatenated to this MetadataForm's metadataKeys .
          // Otherwise, the whole MetadataForm will be pushed as a new form.
          val.forEach(value => {
            const metadataForm = acc.find(addedValue => {
              return addedValue.id === value.id;
            });
            if (metadataForm) {
              // Includes new metadataKey in the existing metadataSchema.
              // Overwrites if the metadataKey already exists.
              for (let [metadataKey, properties] of Object.entries(
                value.metadataSchema.properties
              )) {
                metadataForm.metadataSchema.properties[metadataKey] =
                  properties;
              }

              // Includes uiSchema in the existing uiSchema.
              // Overwrites if the uiSchema already exists for that metadataKey.
              if (value.uiSchema) {
                if (!metadataForm.uiSchema) metadataForm.uiSchema = {};
                for (let [metadataKey, ui] of Object.entries(value.uiSchema)) {
                  metadataForm.uiSchema[metadataKey] = ui;
                }
              }

              // Includes metadataOptions in the existing uiSchema.
              // Overwrites if options already exists for that metadataKey.
              if (value.metadataOptions) {
                if (!metadataForm.metadataOptions)
                  metadataForm.metadataOptions = {};
                for (let [metadataKey, options] of Object.entries(
                  value.metadataOptions
                )) {
                  metadataForm.metadataOptions[metadataKey] = options;
                }
              }
            } else {
              acc.push(value);
            }
          });
          return acc;
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
    const metadataForms: { [section: string]: MetadataFormWidget } = {};

    // Creates all the forms from extensions settings.
    for (let schema of settings.composite
      .metadataforms as ISettingRegistry.IMetadataForm[]) {
      let metaInformation: MetadataForm.IMetaInformation = {};
      let metadataSchema: ISettingRegistry.IMetadataSchema = JSONExt.deepCopy(
        schema.metadataSchema
      );
      let uiSchema: MetadataForm.IUiSchema = {};

      if (schema.uiSchema) {
        uiSchema = JSONExt.deepCopy(schema.uiSchema) as MetadataForm.IUiSchema;
      }

      for (let [metadataKey, properties] of Object.entries(
        metadataSchema.properties
      )) {
        if (properties.default) {
          if (!metaInformation[metadataKey]) metaInformation[metadataKey] = {};
          metaInformation[metadataKey].default = properties.default;
        }
      }

      if (schema.metadataOptions) {
        for (let [metadataKey, options] of Object.entries(
          schema.metadataOptions
        )) {
          // Optionally links key to cell type.
          if (options.cellTypes) {
            if (!metaInformation[metadataKey])
              metaInformation[metadataKey] = {};
            metaInformation[metadataKey].cellTypes = options.cellTypes;
          }

          // Optionally links key to metadata level.
          if (options.metadataLevel) {
            if (!metaInformation[metadataKey])
              metaInformation[metadataKey] = {};
            metaInformation[metadataKey].level = options.metadataLevel;
          }

          // Optionally links key to a custom widget.
          if (options.customWidget) {
            const formWidget = formWidgetsRegistry.getRenderer(
              options.customWidget as string
            );

            // If renderer is defined (custom widget has been registered), set it as used widget.
            if (formWidget !== undefined)
              if (!uiSchema[metadataKey]) uiSchema[metadataKey] = {};
            uiSchema[metadataKey]['ui:widget'] = formWidget;
          }

          // Optionally links key to a custom field.
          if (options.customField) {
            const formField = formComponentRegistry.getRenderer(
              options.customField as string
            );

            // If renderer is defined (custom widget has been registered), set it as used widget.
            if (formField !== undefined)
              if (!uiSchema[metadataKey]) uiSchema[metadataKey] = {};
            uiSchema[metadataKey]['ui:field'] = formField;
          }
        }
      }

      // Adds a section to notebookTools.
      notebookTools.addSection({
        sectionName: schema.id,
        rank: schema.rank,
        label: schema.label ?? schema.id
      });

      // Creates the tool.
      const tool = new MetadataFormWidget(
        metadataSchema,
        metaInformation,
        uiSchema,
        schema._origin,
        translator
      );

      // Adds the form to the section.
      notebookTools.addItem({ section: schema.id, tool: tool });

      tools.push(tool);
      metadataForms[schema.id] = tool;
    }
    return metadataForms;
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
const metadataForm: JupyterFrontEndPlugin<
  { [section: string]: MetadataFormWidget } | undefined
> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [
    INotebookTools,
    ITranslator,
    IFormWidgetRegistry,
    IFormComponentRegistry
  ],
  optional: [ISettingRegistry],
  provides: IMetadataFormProvider,
  activate: async (
    app: JupyterFrontEnd,
    notebookTools: INotebookTools,
    translator: ITranslator,
    widgetsRegistry: IFormWidgetRegistry,
    componentsRegistry: IFormComponentRegistry,
    settings: ISettingRegistry | null
  ): Promise<{ [section: string]: MetadataFormWidget } | undefined> => {
    console.log('Activating Metadata form');
    let tools: MetadataFormWidget[] = [];

    if (settings) {
      return await Private.loadSettingsMetadataForm(
        app,
        tools,
        settings,
        notebookTools,
        translator,
        widgetsRegistry,
        componentsRegistry
      );
    }

    console.log('Metadata form activated');
  }
};

export default metadataForm;
