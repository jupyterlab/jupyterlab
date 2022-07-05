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
    metadataKeys: { [metadataKey: string]: Array<string> };
    properties: { [metadataKey: string]: PartialJSONObject };
  }

  /**
   * Props passed to the FormWidget component
   */
  export interface IProps {
    /**
     * Properties and associated metadata keys defined from the settings.
     */
    properties: IProperties;

    /**
     * Current data of the form.
     */
    formData: ReadonlyPartialJSONObject | null;

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
    this.props = props;
    this.pluginId = pluginId;
  }

  render(): JSX.Element {
    return (
      <Form
        schema={this.props.properties as JSONSchema7}
        formData={this.props.formData}
        idPrefix={`jp-MetadataForm-${this.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this.props.parent.updateMetadata(
            this.props.properties.metadataKeys,
            e.formData
          );
        }}
      />
    );
  }

  private props: MetadataForm.IProps;
  private pluginId?: PartialJSONValue;
}
