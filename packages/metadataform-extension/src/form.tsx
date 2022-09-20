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
import { ITranslator } from '@jupyterlab/translation';

import { MetadataFormWidget } from './index';
import { RJSFTemplatesFactory } from '@jupyterlab/ui-components';

export namespace MetadataForm {
  export interface IProperties {
    type: string;
    properties: { [metadataKey: string]: PartialJSONObject };
  }

  export interface IMetadataKeys {
    [metadataKey: string]: Array<string>;
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
   * Default values
   */
  export interface IDefaultValues {
    [metadataKey: string]: any;
  }

  /**
   * Props passed to the FormWidget component
   */
  export interface IProps {
    /**
     * Properties defined from the settings.
     */
    properties: IProperties;

    /**
     *  Metadata keys associated to properties.
     */
    metadataKeys: IMetadataKeys;

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
    parent: MetadataFormWidget;

    /**
     * The uiSchema built when loading schemas.
     */
    uiSchema: IUiSchema;

    /**
     * The default values for each key.
     */
    defaultValues: IDefaultValues;
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
      showModified: false
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
        FieldTemplate={this._templateFactory.fieldTemplate}
        ArrayFieldTemplate={this._templateFactory.arrayTemplate}
        ObjectFieldTemplate={this._templateFactory.objectTemplate}
        uiSchema={this._props.uiSchema}
        liveValidate
        idPrefix={`jp-MetadataForm-${this.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this._props.parent.updateMetadata(
            this._props.metadataKeys,
            e.formData,
            this._props.defaultValues
          );
        }}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private pluginId?: PartialJSONValue;
  private _templateFactory: RJSFTemplatesFactory;
}
