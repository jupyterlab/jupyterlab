/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ReactWidget } from '@jupyterlab/apputils';
import React from 'react';
import Form, { IChangeEvent } from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import {
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import { ITranslator } from '@jupyterlab/translation';

import { MetadataFormWidget } from './index';
import { RJSFTemplatesFactory } from '@jupyterlab/ui-components';

export namespace MetadataForm {
  /**
   * The properties formatted for React jSON schema form use.
   */
  export interface IProperties {
    type: string;
    properties: { [formKey: string]: PartialJSONObject };
  }

  /**
   * The meta information associated to all properties.
   */
  export interface IMetaInformation {
    [formKey: string]: ISingleMetaInformation;
  }

  /**
   * The meta information associated to a property.
   */
  export interface ISingleMetaInformation {
    /**
     * The (nested) metadata key as an array of keys.
     */
    metadataKey: IMetadataKey;
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
    cellTypes?: nbformat.CellType[];
  }

  /**
   * The (nested) metadata key, as an array of keys.
   */
  export type IMetadataKey = Array<string>;

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
    properties: IProperties;

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

  public set props(newProps: MetadataForm.IProps) {
    this._props = newProps;
  }

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
