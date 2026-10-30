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
import { getDefaultRegistry } from '@rjsf/core';
import type { Field, FieldProps } from '@rjsf/utils';
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
    this._idPrefix = `jp-MetadataForm-${props.pluginId}`;
    // RJSF uses the root field id of the uiSchema instead of the prefix, if set.
    const rootId =
      (props.uiSchema['ui:rootFieldId'] as unknown as string) || this._idPrefix;
    this._fields = Private.createFields(rootId);
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
    const updateMetadata = (
      formData: ReadonlyPartialJSONObject,
      reload?: boolean
    ): void => {
      const owner = this._props.metadataFormWidget;
      if (owner.isDisposed || owner.form !== this) return;
      owner.updateMetadata(formData, reload, this._sourceCell);
    };
    const formContext = {
      defaultFormData: this._props.settings.default(),
      updateMetadata
    };
    return (
      <FormComponent
        validator={validator}
        schema={this._props.properties as JSONSchema7}
        formData={this._props.formData}
        formContext={formContext}
        uiSchema={this._props.uiSchema}
        fields={this._fields}
        liveValidate
        idPrefix={this._idPrefix}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>, id?: string) => {
          // The field of a metadata key reports its changes with the key as id.
          // The values that the form fills in itself come without an id.
          if (id === undefined) return;
          const formData = e.formData || {};
          updateMetadata({ [id]: formData[id] });
        }}
        compact={true}
        showModifiedFromDefault={this._props.showModified}
        translator={this._props.translator}
        disabled={this._props.disabled}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private _idPrefix: string;
  private _fields: { SchemaField: Field; NullField: Field };
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

  /**
   * Create the SchemaField and the NullField of the form.
   *
   * The SchemaField reports each change of a metadata key's field with the key
   * as id, because a field id joins names with `_` and keys may contain `_` too.
   */
  export function createFields(rootId: string): {
    SchemaField: Field;
    NullField: Field;
  } {
    const { NullField, SchemaField } = getDefaultRegistry().fields;
    // The metadata key of the field that reported the last change.
    let changedKey: string | null = null;
    // The metadata key of the field that a field is in.
    const KeyContext = React.createContext<string | null>(null);

    function MetadataSchemaField(props: FieldProps): JSX.Element {
      const { idSchema, name, onChange } = props;
      // The id of a property of the root field is the root id and its name;
      // the ids of nested fields are longer.
      if (idSchema.$id !== `${rootId}_${name}`) {
        return <SchemaField {...props} />;
      }
      return (
        <KeyContext.Provider value={name}>
          <SchemaField
            {...props}
            onChange={(value, errorSchema) => {
              changedKey = name;
              onChange(value, errorSchema, name);
            }}
          />
        </KeyContext.Provider>
      );
    }

    function MetadataNullField(props: FieldProps): JSX.Element | null {
      // RJSF's NullField sets a missing value to null when it mounts, and the
      // form writes that change. Use it only for a field that mounts after a
      // change of its key, such as the null option that the user chooses.
      const key = React.useContext(KeyContext);
      const [afterChange] = React.useState(
        () => key !== null && key === changedKey
      );
      return afterChange ? <NullField {...props} /> : null;
    }

    return { SchemaField: MetadataSchemaField, NullField: MetadataNullField };
  }
}
