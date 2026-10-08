// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform
 */

import { ReactWidget } from '@jupyterlab/apputils';
import type { NotebookTools } from '@jupyterlab/notebook';
import { FormComponent } from '@jupyterlab/ui-components';
import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';
import type { IChangeEvent } from '@rjsf/core';
import type validatorAjv8 from '@rjsf/validator-ajv8';
import type { JSONSchema7 } from 'json-schema';
import React from 'react';

import type { MetadataForm } from './token';

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
    // The cell this form is built for. Captured at construction time so a
    // stale form can be recognized later.
    this._sourceCell =
      props.metadataFormWidget.notebookTools?.activeCell ?? null;
    if (Private.getValidator() === null) {
      void Private.ensureValidator().then(() => {
        if (!this.isDisposed) {
          this.update();
        }
      });
    }
  }

  /**
   * Render the form.
   * @returns - The rendered form
   */
  render(): JSX.Element | null {
    const validator = Private.getValidator();
    if (validator === null) {
      return null;
    }
    const formContext = {
      defaultFormData: this._props.settings.default(),
      // Bind custom-field updates to the cell this form was built for,
      // the same guard the onChange path below applies.
      updateMetadata: (
        formData: ReadonlyPartialJSONObject,
        reload?: boolean
      ) =>
        this._props.metadataFormWidget.updateMetadata(
          formData,
          reload,
          this._sourceCell
        )
    };
    return (
      <FormComponent
        validator={validator}
        schema={this._props.properties as JSONSchema7}
        formData={this._props.formData}
        formContext={formContext}
        uiSchema={this._props.uiSchema}
        liveValidate
        idPrefix={`jp-MetadataForm-${this._props.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this._props.metadataFormWidget.updateMetadata(
            e.formData || {},
            undefined,
            this._sourceCell
          );
        }}
        compact={true}
        showModifiedFromDefault={this._props.showModified}
        translator={this._props.translator}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private _sourceCell: NotebookTools['activeCell'] = null;
}

/**
 * A namespace for private data.
 */
namespace Private {
  let validatorLoaded: PromiseDelegate<typeof validatorAjv8> | null = null;

  /**
   * The validator once it has loaded, for the synchronous render path.
   */
  let validator: typeof validatorAjv8 | null = null;

  /**
   * Lazily load the validator when the first form is created.
   */
  export async function ensureValidator(): Promise<typeof validatorAjv8> {
    if (validatorLoaded == null) {
      validatorLoaded = new PromiseDelegate();
      validator = (await import('@rjsf/validator-ajv8')).default;
      validatorLoaded.resolve(validator);
    }
    return validatorLoaded.promise;
  }

  /**
   * Get the validator, or null before it has loaded.
   */
  export function getValidator(): typeof validatorAjv8 | null {
    return validator;
  }
}
