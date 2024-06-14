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

  const [isUpdate, setUpdate] = useState(0);

  const formRef = createRef() as RefObject<Form<any, RJSFSchema, any>>;

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
    if(!isUpdate) {
      props.updateFormData(formData);
    }
    if (formRef.current && formRef?.current.validateForm()) {
      props.updateFormData(formData);
    }
    let update = isUpdate+1;
    setUpdate(update);
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
