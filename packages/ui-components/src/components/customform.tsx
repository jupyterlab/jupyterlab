import React from 'react';
import type Form from '@rjsf/core';
import { type IChangeEvent } from '@rjsf/core';

import { ReactWidget } from './vdom';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';
import type { PartialJSONObject, ReadonlyJSONObject } from '@lumino/coreutils';
import { FormComponent } from './form';

import type { TranslationBundle } from '@jupyterlab/translation';

type FormDataProps =
  | IChangeEvent<ReadonlyJSONObject, RJSFSchema, Record<string, unknown>>
  | undefined
  | PartialJSONObject;

/**
 * Form to select custom properties of kernel
 *
 * @returns The React component
 */

const FormComponentWrapper = (props: {
  schema: RJSFSchema;
  kernelConfiguration: FormDataProps;
  updateFormData: (formData: FormDataProps) => void;
}): JSX.Element | null => {
  const [isUpdate, setUpdate] = React.useState(0);

  const [validator, setValidator] = React.useState<ValidatorType | null>(null);

  React.useEffect(() => {
    let mounted = true;
    void import('@rjsf/validator-ajv8').then(module => {
      if (mounted) {
        setValidator(() => module.default);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!validator) {
    return null;
  }
  const formRef =
    React.useRef<Form<ReadonlyJSONObject, RJSFSchema, Record<string, unknown>>>(
      null
    );

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
  const onChange = ({
    formData
  }: IChangeEvent<ReadonlyJSONObject, RJSFSchema, Record<string, unknown>>) => {
    const safeFormData = (formData ?? {}) as FormDataProps;

    if (!isUpdate) {
      props.updateFormData(safeFormData);
    }
    // Fixed optional chaining syntax error (formRef?.current is invalid, formRef.current is correct)
    if (formRef.current && formRef.current.validateForm()) {
      props.updateFormData(safeFormData);
    }
    const update = isUpdate + 1;
    setUpdate(update);
  };
  const formData: ReadonlyJSONObject = {};

  return (
    <FormComponent
      formData={formData}
      schema={props.schema}
      uiSchema={uiSchema}
      validator={validator}
      onChange={onChange}
      ref={formRef}
      idPrefix={`jp-CustomKernel-test`}
      showModifiedFromDefault={false}
    />
  );
};

/**
 * A Dialog Widget that wraps a FormComponent.
 */
export class DialogWidget extends ReactWidget {
  schema: RJSFSchema;
  formData: FormDataProps;
  updateFormData: (formData: FormDataProps) => void;
  kernelConfiguration: FormDataProps;
  /**
   * Constructs a new FormWidget.
   */
  constructor(
    schema: RJSFSchema,
    kernelConfiguration: FormDataProps,
    updateFormData: (formData: FormDataProps) => void,
    trans: TranslationBundle
  ) {
    super();
    this.schema = schema;
    this.formData = undefined;
    this.kernelConfiguration = kernelConfiguration;
    this.updateFormData = updateFormData;
  }

  getValue(): FormDataProps {
    return this.kernelConfiguration;
  }

  render(): JSX.Element {
    return (
      <FormComponentWrapper
        schema={this.schema}
        kernelConfiguration={this.kernelConfiguration}
        updateFormData={this.updateFormData}
      />
    );
  }
}
