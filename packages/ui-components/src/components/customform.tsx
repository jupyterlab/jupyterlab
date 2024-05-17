import React, { RefObject, createRef, useState } from 'react';
import Form, { IChangeEvent } from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { PartialJSONObject} from '@lumino/coreutils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ReactWidget } from './vdom';
import { FormComponent } from './form';


type FormDataProps = IChangeEvent<any, RJSFSchema, any> | undefined | PartialJSONObject | {};

/**
 * Form to select custom properties of kernel
 *
 * @returns The React component
 */

const FormComponentWrapper = (props: {
  schema: RJSFSchema,
  kernelConfigurarion: FormDataProps,
  updateFormData: (
    formData: FormDataProps
  ) => void;
}): JSX.Element => {

  const [errorList, setErrors] = useState();

  const formRef = createRef() as RefObject<Form<any, RJSFSchema, any>>;
  const onError = (errors: any) => 
    {
      setErrors(errors)
      console.log('errors');
      console.log("errors");
    };
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
   // if (formRef.current && formRef.current.validateForm()) {
    console.log('onChange and errorList');
    console.dir(errorList);
    if (!errorList) {
      console.log('update data');
      props.updateFormData(formData);
    }
   // }
  };
  
  const formData: Record<string, any> = {};

  return (
    <FormComponent
      formData={formData}
      schema={props.schema}
      uiSchema={uiSchema}
      validator={validator}
      onChange={onChange}
      liveValidate
      ref={formRef}
      onError={onError}
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
  formData: FormDataProps | {};
  updateFormData: (formData: FormDataProps) => void;
  kernelConfigurarion: FormDataProps;
  /**
   * Constructs a new FormWidget.
   */
  constructor(schema: RJSFSchema, kernelConfigurarion: FormDataProps, updateFormData: (
    formData: FormDataProps
  ) => void, trans:IRenderMime.TranslationBundle) {
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
      <FormComponentWrapper schema={this.schema} kernelConfigurarion={this.kernelConfigurarion} updateFormData={this.updateFormData} />
    );
  }
}