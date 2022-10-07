/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import Form, { IChangeEvent } from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import { PartialJSONValue, ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { ReactWidget } from '@jupyterlab/apputils';
import { CellType } from '@jupyterlab/nbformat';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { RJSFTemplatesFactory } from '@jupyterlab/ui-components';

import { MetadataFormWidget } from './index';

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
     * The default value for this metadata.
     */
    default?: any;
    /**
     * The cell types to display this metadata field.
     */
    cellTypes?: CellType[];
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
    metaInformation: IMetaInformation;

    /**
     * Current data of the form.
     */
    formData: ReadonlyPartialJSONObject | null;

    // /**
    //  *  Errors on the form.
    //  */
    // errors?: {[keyError: string]: {__errors: string}};

    /**
     * Translator object
     */
    translator: ITranslator;

    /**
     * The parent object of the form.
     */
    formWidget: MetadataFormWidget;

    /**
     * The uiSchema built when loading schemas.
     */
    uiSchema: IUiSchema;
  }
}

/**
 * A ReactWidget with the form itself.
 */
export class FormWidget extends ReactWidget {
  /**
   * Constructs a new FormWidget.
   */
  constructor(props: MetadataForm.IProps, pluginId?: string) {
    super();
    this.addClass('jp-ReactWidget');
    this._props = props;
    this.pluginId = pluginId;
    this._templateFactory = new RJSFTemplatesFactory({
      translator: this._props.translator,
      compact: true,
      showModifiedFromDefault: false
    });
  }

  /**
   * Render the form.
   * @returns - The rendered form
   */
  render(): JSX.Element {
    return (
      <Form
        schema={this._props.properties as JSONSchema7}
        formData={this._props.formData}
        formContext={this._props}
        FieldTemplate={this._templateFactory.fieldTemplate}
        ArrayFieldTemplate={this._templateFactory.arrayTemplate}
        ObjectFieldTemplate={this._templateFactory.objectTemplate}
        uiSchema={this._props.uiSchema}
        liveValidate
        idPrefix={`jp-MetadataForm-${this.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this._props.formWidget.updateMetadata(e.formData);
        }}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private pluginId?: PartialJSONValue;
  private _templateFactory: RJSFTemplatesFactory;
}
