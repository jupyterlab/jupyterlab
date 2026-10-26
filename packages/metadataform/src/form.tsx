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
      SchemaField: Private.createSchemaField(rootId, this._changedKeys)
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
          // Write only the metadata key whose field was changed. The form also
          // reports values that it fills in itself, e.g. the defaults when it
          // is created, for which no field recorded a key.
          if (id === undefined) return;
          // The form reports the changes of a field in the order they were made.
          const pendingKeys = this._changedKeys.get(id);
          const metadataKey = pendingKeys?.shift();
          if (metadataKey === undefined) return;
          if (pendingKeys?.length === 0) this._changedKeys.delete(id);
          const formData = e.formData || {};
          this._props.metadataFormWidget.updateMetadata({
            [metadataKey]: formData[metadataKey]
          });
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
  /**
   * The metadata keys of the changes that the form has not reported yet, in
   * the order of the changes, by the id of the changed field.
   */
  private _changedKeys = new Map<string, string[]>();
  private _fields: { SchemaField: Field };
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
   * Create a SchemaField that records the metadata key of each change.
   *
   * RJSF reports a change with the id of the changed field, which joins the
   * names of the metadata key and of the nested fields with `_`. Keys may
   * contain `_` too, so an id does not identify a key. Instead, the field of
   * each metadata key, i.e. each property of the root field, records its key
   * for each change that it passes on, with the id that the form reports the
   * change with.
   *
   * @param rootId - the id of the root field of the form.
   * @param changedKeys - the map to record the metadata keys in.
   */
  export function createSchemaField(
    rootId: string,
    changedKeys: Map<string, string[]>
  ): Field {
    const { SchemaField } = getDefaultRegistry().fields;
    // The change handlers that record a key. The option of a `oneOf` or
    // `anyOf` key is rendered with the props of the key's field, including
    // this handler, and must not record the key a second time.
    const recording = new WeakSet<FieldProps['onChange']>();
    return function MetadataSchemaField(props: FieldProps): JSX.Element {
      const { idSchema, name, onChange } = props;
      // The id of a property of the root field is the root id and its name;
      // the ids of nested fields are longer.
      if (idSchema.$id !== `${rootId}_${name}` || recording.has(onChange)) {
        return <SchemaField {...props} />;
      }
      const recordingOnChange: FieldProps['onChange'] = (
        value,
        errorSchema,
        id
      ) => {
        const fieldId = id ?? idSchema.$id;
        const pendingKeys = changedKeys.get(fieldId) ?? [];
        pendingKeys.push(name);
        changedKeys.set(fieldId, pendingKeys);
        onChange(value, errorSchema, fieldId);
      };
      recording.add(recordingOnChange);
      return <SchemaField {...props} onChange={recordingOnChange} />;
    };
  }
}
