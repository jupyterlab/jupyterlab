// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform
 */

import { CellType } from '@jupyterlab/nbformat';
import { NotebookTools } from '@jupyterlab/notebook';
import { BaseSettings, ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import {
  PartialJSONObject,
  ReadonlyJSONObject,
  Token
} from '@lumino/coreutils';
import { MetadataFormWidget } from './metadataform';

export namespace MetadataForm {
  /**
   * The metadata schema as defined in JSON schema.
   */
  export type IMetadataSchema = ISettingRegistry.IMetadataSchema;

  /**
   * The meta information associated to all properties.
   */
  export interface IMetaInformation {
    [metadataKey: string]: ISingleMetaInformation;
  }

  /**
   * The meta information associated to a property.
   */
  export interface ISingleMetaInformation {
    /**
     * The metadata level, 'cell' or 'notebook'.
     */
    level?: 'cell' | 'notebook';

    /**
     * The cell types to display this metadata field.
     */
    cellTypes?: CellType[];

    /**
     * The default value for this metadata.
     */
    default?: any;

    /**
     * Whether to avoid writing default value in metadata.
     */
    writeDefault?: boolean;
  }

  /**
   * RJSF ui:schema.
   */
  export interface IUiSchema {
    [metadataKey: string]: IUiSchemaOption;
  }

  /**
   * RJSF ui:schema options.
   */
  export interface IUiSchemaOption {
    [option: string]: any;
  }

  /**
   * Options passed to MetadataFormWidget.
   */
  export interface IOptions {
    /**
     * MetadataSchema defined from the settings.
     */
    metadataSchema: IMetadataSchema;

    /**
     * The meta information associated to all properties.
     */
    metaInformation: IMetaInformation;

    /**
     * The uiSchema built when loading schemas.
     */
    uiSchema?: IUiSchema;

    /**
     * The plugin ID.
     */
    pluginId?: string;

    /**
     * Translator object.
     */
    translator?: ITranslator;

    /**
     * Whether to show the modified field from default value.
     */
    showModified?: boolean;
  }

  /**
   * Props passed to the FormWidget component.
   */
  export interface IProps {
    /**
     * Properties defined from the settings.
     */
    properties: IMetadataSchema;

    /**
     * Meta information associated to properties.
     */
    settings: BaseSettings;

    /**
     * Current data of the form.
     */
    formData: ReadonlyJSONObject;

    /**
     * Translator object.
     */
    translator: ITranslator;

    /**
     * The parent object of the form.
     */
    metadataFormWidget: MetadataFormWidget;

    /**
     * The uiSchema built when loading schemas.
     */
    uiSchema: IUiSchema;

    /**
     * Whether to show the modified field from default value.
     */
    showModified: boolean;

    /**
     * The plugin ID.
     */
    pluginId?: string;
  }

  /**
   * A metadata form interface provided when registering
   * to a metadata form provider.  Allows an owner widget
   * to set the metadata form content for itself.
   */
  export interface IMetadataForm extends NotebookTools.Tool {
    /**
     * Get the list of existing metadataKey (array of string).
     *
     * ## NOTE:
     * The list contains also the conditional fields, which are not necessary
     * displayed and filled.
     */
    readonly metadataKeys: string[];

    /**
     * Get the properties of a MetadataKey.
     * @param metadataKey - metadataKey (array of string).
     */
    getProperties(metadataKey: string): PartialJSONObject | null;

    /**
     * Set properties to a metadataKey.
     * @param metadataKey - metadataKey (array of string).
     * @param properties - the properties to add or modify.
     */
    setProperties(metadataKey: string, properties: PartialJSONObject): void;

    /**
     * Update the metadata of the current cell or notebook.
     *
     * @param formData the cell metadata set in the form.
     * @param reload whether to update the form after updating the metadata.
     *
     * ## Notes
     * Metadata are updated from root only. If some metadata is nested,
     * the whole root object must be updated.
     * This function build an object with all the root object to update
     * in metadata before performing update.
     */
    updateMetadata(formData: ReadonlyJSONObject, reload?: boolean): void;
  }
}

/**
 * A provider for metadata form.
 */
export interface IMetadataFormProvider {
  /**
   * Add a MetadataFormWidget to the provider.
   */
  add(id: string, widget: MetadataForm.IMetadataForm): void;

  /**
   * Get a MetadataFormWidget from id.
   */
  get(id: string): MetadataForm.IMetadataForm | undefined;

  /**
   * Each ID must be described in schema.
   */
  _items: { [id: string]: MetadataForm.IMetadataForm };
}

/**
 * The metadata form provider token.
 */
export const IMetadataFormProvider = new Token<IMetadataFormProvider>(
  '@jupyterlab/metadataform:IMetadataFormProvider',
  `A service to register new metadata editor widgets.`
);
