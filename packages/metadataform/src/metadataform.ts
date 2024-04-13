// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform
 */

import { NotebookTools } from '@jupyterlab/notebook';
import { BaseSettings } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  JSONExt,
  JSONObject,
  JSONValue,
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { SingletonLayout, Widget } from '@lumino/widgets';

import { MetadataForm } from './token';
import { FormWidget } from './form';

/**
 * A class that create a metadata form widget
 */
export class MetadataFormWidget
  extends NotebookTools.Tool
  implements MetadataForm.IMetadataForm
{
  /**
   * Construct an empty widget.
   */
  constructor(options: MetadataForm.IOptions) {
    super();
    this._metadataSchema = options.metadataSchema;
    this._metaInformation = options.metaInformation;
    this._uiSchema = options.uiSchema || {};
    this._pluginId = options.pluginId;
    this._showModified = options.showModified || false;
    this.translator = options.translator || nullTranslator;
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
   * Get the form object itself.
   */
  get form(): FormWidget | undefined {
    return this._form;
  }

  /**
   * Get the list of existing metadataKey (array of string).
   *
   * ## NOTE:
   * The list contains also the conditional fields, which are not necessary
   * displayed and filled.
   */
  get metadataKeys(): string[] {
    const metadataKeys: string[] = [];

    // MetadataKey from schema.
    for (let metadataKey of Object.keys(this._metadataSchema.properties)) {
      metadataKeys.push(metadataKey);
    }

    // Possible additional metadataKeys from conditional schema.
    this._metadataSchema.allOf?.forEach(conditional => {
      if (conditional.then !== undefined) {
        if ((conditional.then as PartialJSONObject).properties !== undefined) {
          let properties = (conditional.then as PartialJSONObject)
            .properties as PartialJSONObject;
          for (let metadataKey of Object.keys(properties)) {
            if (!metadataKeys.includes(metadataKey))
              metadataKeys.push(metadataKey);
          }
        }
      }

      if (conditional.else !== undefined) {
        if ((conditional.else as PartialJSONObject).properties !== undefined) {
          let properties = (conditional.else as PartialJSONObject)
            .properties as PartialJSONObject;
          for (let metadataKey of Object.keys(properties)) {
            if (!metadataKeys.includes(metadataKey))
              metadataKeys.push(metadataKey);
          }
        }
      }
    });

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
   * It uses an arrow function to allow using 'this' properly when called from a custom field.
   */
  updateMetadata = (
    formData: ReadonlyPartialJSONObject,
    reload?: boolean
  ): void => {
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
      // Continue if the metadataKey does not exist in schema.
      if (!this.metadataKeys.includes(metadataKey)) continue;

      // Continue if the metadataKey is a notebook level one and there is no NotebookModel.
      if (
        this._metaInformation[metadataKey]?.level === 'notebook' &&
        this._notebookModelNull
      )
        continue;

      // Continue if the metadataKey is not applicable to the cell type.
      if (
        this._metaInformation[metadataKey]?.cellTypes &&
        !this._metaInformation[metadataKey]?.cellTypes?.includes(
          cell.model.type
        )
      ) {
        continue;
      }
      let currentMetadata: PartialJSONObject;
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
        ((this._metaInformation[metadataKey]?.writeDefault ?? true) ||
          value !== this._metaInformation[metadataKey]?.default);

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
        metadataObject[baseMetadataKey] = currentMetadata[baseMetadataKey];
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
      if (value === undefined) cell.model.deleteMetadata(key);
      else cell.model.setMetadata(key, value as ReadonlyPartialJSONValue);
    }

    // Set the notebook metadata or delete it if value is undefined or empty object.
    if (!this._notebookModelNull) {
      for (let [key, value] of Object.entries(notebookMetadataObject)) {
        if (value === undefined) notebook!.model!.deleteMetadata(key);
        else
          notebook!.model!.setMetadata(key, value as ReadonlyPartialJSONValue);
      }
    }

    this._updatingMetadata = false;

    if (reload) {
      this._update();
    }
  };

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
    this._form = new FormWidget(props);
    this._form.addClass('jp-MetadataForm');
    this.setContent(this._form);
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
  protected onActiveCellMetadataChanged(_: Message): void {
    if (!this._updatingMetadata && this.isVisible) this._update();
  }

  /**
   * Handle when the active notebook panel changes.
   */
  protected onActiveNotebookPanelChanged(_: Message): void {
    const notebook = this.notebookTools.activeNotebookPanel;
    this._notebookModelNull = notebook === null || notebook.model === null;
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

    const formProperties: MetadataForm.IMetadataSchema = JSONExt.deepCopy(
      this._metadataSchema
    );

    const formData = {} as JSONObject;

    for (let metadataKey of Object.keys(
      this._metadataSchema.properties || JSONExt.emptyObject
    )) {
      // Do not display the field if it's Notebook metadata and the notebook model is null.
      if (
        this._metaInformation[metadataKey]?.level === 'notebook' &&
        this._notebookModelNull
      ) {
        delete formProperties.properties![metadataKey];
        continue;
      }

      // Do not display the field if the active cell's type is not involved.
      if (
        this._metaInformation[metadataKey]?.cellTypes &&
        !this._metaInformation[metadataKey]?.cellTypes?.includes(
          cell.model.type
        )
      ) {
        delete formProperties.properties![metadataKey];
        continue;
      }

      let workingObject: PartialJSONObject;

      // Remove the first and last '/' if exist, nad split the path.
      let nestedKeys = metadataKey
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .split('/');

      // Associates the correct metadata object to the working object.
      if (this._metaInformation[metadataKey]?.level === 'notebook') {
        workingObject = notebook!.model!.metadata;
      } else {
        workingObject = cell.model.metadata;
      }

      let hasValue = true;

      // Navigate to the value.
      for (let nested of nestedKeys) {
        if (nested in workingObject)
          workingObject = workingObject[nested] as JSONObject;
        else {
          hasValue = false;
          break;
        }
      }

      // Fill the formData with the current metadata value.
      if (hasValue) formData[metadataKey] = workingObject as JSONValue;
    }

    this.buildWidget({
      properties: formProperties,
      settings: new BaseSettings({
        schema: this._metadataSchema as PartialJSONObject
      }),
      uiSchema: this._uiSchema,
      translator: this.translator || null,
      formData: formData,
      metadataFormWidget: this,
      showModified: this._showModified,
      pluginId: this._pluginId
    });
  }

  protected translator: ITranslator;
  private _form: FormWidget | undefined;
  private _metadataSchema: MetadataForm.IMetadataSchema;
  private _metaInformation: MetadataForm.IMetaInformation;
  private _uiSchema: MetadataForm.IUiSchema;
  private _trans: TranslationBundle;
  private _placeholder: Widget;
  private _updatingMetadata: boolean;
  private _pluginId: string | undefined;
  private _showModified: boolean;
  private _notebookModelNull: boolean = false;
}

namespace Private {
  /**
   * The metadata representation object.
   */
  export interface IMetadataRepresentation {
    [metadata: string]: PartialJSONObject | PartialJSONValue | undefined;
  }

  /**
   * Recursive function to clean the empty nested metadata before updating real metadata.
   * this function is called when a nested metadata is undefined (or default), so maybe some
   * object are now empty.
   * @param metadataObject PartialJSONObject representing the metadata to update.
   * @param metadataKeysList Array<string> of the undefined nested metadata.
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
