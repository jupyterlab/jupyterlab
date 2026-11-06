// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @packageDocumentation
 * @module metadataform
 */

/* global WeakRef */

import { ReactWidget } from '@jupyterlab/apputils';
import type { NotebookTools } from '@jupyterlab/notebook';
import { FormComponent } from '@jupyterlab/ui-components';
import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import type { IChangeEvent } from '@rjsf/core';
import validatorAjv8 from '@rjsf/validator-ajv8';
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
    // The model of the cell this form is built for, held weakly so that the
    // form does not keep a closed notebook in memory. Captured at
    // construction time so a stale form can be recognized later.
    const cell = props.metadataFormWidget.notebookTools?.activeCell;
    this._sourceModel = cell ? new WeakRef(cell.model) : null;
  }

  /**
   * Render the form.
   * @returns - The rendered form
   */
  render(): JSX.Element {
    const updateMetadata = (
      formData: ReadonlyPartialJSONObject,
      reload?: boolean
    ): void => {
      const owner = this._props.metadataFormWidget;
      // A replaced form must not write, nor a form that stayed hidden while the
      // active cell changed: its fields can still write later, for example when
      // a request finishes.
      if (owner.isDisposed || owner.form !== this) return;
      const activeCell = owner.notebookTools?.activeCell;
      if (
        this._sourceModel &&
        activeCell?.model !== this._sourceModel.deref()
      ) {
        return;
      }
      owner.updateMetadata(formData, reload);
    };
    const formContext = {
      defaultFormData: this._props.settings.default(),
      updateMetadata
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
          updateMetadata(e.formData || {});
        }}
        compact={true}
        showModifiedFromDefault={this._props.showModified}
        translator={this._props.translator}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private _sourceModel: WeakRef<
    NonNullable<NotebookTools['activeCell']>['model']
  > | null = null;
}
