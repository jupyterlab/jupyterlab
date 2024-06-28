/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';

import Form, { IChangeEvent } from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { PartialJSONObject } from '@lumino/coreutils';

type FormDataProps =
  | IChangeEvent<any, RJSFSchema, any>
  | undefined
  | PartialJSONObject
  | {};

/**
 * Form to select custom properties of kernel
 *
 * @returns The React component
 */

const FormComponent = (props: {
  schema: RJSFSchema;
  kernelConfigurarion: FormDataProps;
  updateFormData: (formData: FormDataProps) => void;
}): JSX.Element => {
  const uiSchema: UiSchema = {
    'ui:options': {
      submitButtonOptions: {
        props: {
          disabled: true
        },
        norender: true
      }
    }
  };

  const onChange = ({ formData }: IChangeEvent<any, RJSFSchema, any>) => {
    console.log('+++');
    props.updateFormData(formData);
  };

  return (
    <Form
      schema={props.schema}
      uiSchema={uiSchema}
      validator={validator}
      onChange={onChange}
    />
  );
};

/**
 * A Button Lumino Widget that wraps a FormComponent.
 */
export class DialogWidget extends ReactWidget {
  schema: RJSFSchema;
  formData: FormDataProps | {};
  updateFormData: (formData: FormDataProps) => void;
  kernelConfigurarion: FormDataProps;
  /**
   * Constructs a new FormWidget.
   */
  constructor(
    schema: RJSFSchema,
    kernelConfigurarion: FormDataProps,
    updateFormData: (formData: FormDataProps) => void
  ) {
    super();
    this.schema = schema;
    this.formData = undefined;
    this.kernelConfigurarion = kernelConfigurarion;
    this.updateFormData = updateFormData;
  }

  getValue(): FormDataProps | {} {
    return this.kernelConfigurarion;
  }

  render(): JSX.Element {
    return (
      <FormComponent
        schema={this.schema}
        kernelConfigurarion={this.kernelConfigurarion}
        updateFormData={this.updateFormData}
      />
    );
  }
}
