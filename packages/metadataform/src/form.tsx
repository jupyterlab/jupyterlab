// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform
 */

import { ReactWidget } from '@jupyterlab/apputils';
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
    this._fields = {
      SchemaField: Private.createSchemaField(rootId),
      // RJSF's NullField calls onChange(null) when it mounts without a value,
      // and the form writes every change to the metadata.
      NullField: () => null
    };
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
      updateMetadata: this._props.metadataFormWidget.updateMetadata
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
          this._props.metadataFormWidget.updateMetadata({ [id]: formData[id] });
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
   * Create a SchemaField that reports each change of a metadata key's field
   * with the key as id, because a field id joins names with `_` and keys may
   * contain `_` too.
   */
  export function createSchemaField(rootId: string): Field {
    const { SchemaField } = getDefaultRegistry().fields;
    return function MetadataSchemaField(props: FieldProps): JSX.Element {
      const { idSchema, name, onChange } = props;
      // The id of a property of the root field is the root id and its name;
      // the ids of nested fields are longer.
      if (idSchema.$id !== `${rootId}_${name}`) {
        return <SchemaField {...props} />;
      }
      return (
        <SchemaField
          {...props}
          onChange={(value, errorSchema) => onChange(value, errorSchema, name)}
        />
      );
    };
  }
}
