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

export namespace MetadataForm {
  export interface IProperties {
    type: string;
    properties: { [metadataKey: string]: PartialJSONObject };
  }

  export interface IMetadataKeys {
    [metadataKey: string]: Array<string>;
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
    translator: ITranslator | null;

    /**
     * The parent object of the form.
     */
    parent: MetadataFormWidget;
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
  }

  public set props(newProps: MetadataForm.IProps) {
    this._props = newProps;
  }

  render(): JSX.Element {
    return (
      <Form
        schema={this._props.properties as JSONSchema7}
        formData={this._props.formData}
        // FieldTemplate={CustomTemplate}
        // ArrayFieldTemplate={CustomArrayTemplateFactory(
        //   this.props.translator
        // )}
        // ObjectFieldTemplate={CustomObjectTemplateFactory(
        //   this.props.translator
        // )}
        // uiSchema={uiSchema}
        // fields={this.props.renderers}
        // formContext={{ settings: this.props.settings }}
        // extraErrors={this._props.errors}
        liveValidate
        idPrefix={`jp-MetadataForm-${this.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          console.log(e);
          this._props.parent.updateMetadata(
            this._props.metadataKeys,
            e.formData
          );
        }}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private pluginId?: PartialJSONValue;
}
