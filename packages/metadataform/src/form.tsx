// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { FormComponent } from '@jupyterlab/ui-components';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { IChangeEvent } from '@rjsf/core';
import validatorAjv8 from '@rjsf/validator-ajv8';
import { JSONSchema7 } from 'json-schema';
import React from 'react';

import { MetadataForm } from './token';

/**
 * A ReactWidget with the form itself.
 */
export class FormWidget extends ReactWidget {
  /**
   * Constructs a new FormWidget.
   */
  constructor(props: MetadataForm.IProps) {
    super();
    this.addClass('jp-FormWidget');
    this._props = props;
  }

  /**
   * Render the form.
   * @returns - The rendered form
   */
  render(): JSX.Element {
    const formContext = {
      defaultFormData: this._props.settings.default(),
      updateMetadata: this._props.metadataFormWidget.updateMetadata
    };
    return (
      <FormComponent
        validator={validatorAjv8}
        schema={this._props.properties as JSONSchema7}
        formData={this._props.formData as Record<string, any>}
        formContext={formContext}
        uiSchema={this._props.uiSchema}
        liveValidate
        idPrefix={`jp-MetadataForm-${this._props.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this._props.metadataFormWidget.updateMetadata(e.formData || {});
        }}
        compact={true}
        showModifiedFromDefault={this._props.showModified}
        translator={this._props.translator}
      />
    );
  }

  private _props: MetadataForm.IProps;
}
