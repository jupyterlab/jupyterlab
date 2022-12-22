// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform
 */

import React from 'react';
import Form, { IChangeEvent } from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { ReactWidget } from '@jupyterlab/apputils';
import { RJSFTemplatesFactory } from '@jupyterlab/ui-components';

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
    this._templateFactory = new RJSFTemplatesFactory({
      translator: this._props.translator,
      compact: true,
      showModifiedFromDefault: props.showModified
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
        idPrefix={`jp-MetadataForm-${this._props.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this._props.metadataFormWidget.updateMetadata(e.formData);
        }}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private _templateFactory: RJSFTemplatesFactory;
}
