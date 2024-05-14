import React from 'react';

import { IChangeEvent } from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { PartialJSONObject, ReadonlyPartialJSONObject } from '@lumino/coreutils';
//import { ReactWidget } from '@jupyterlab/apputils';
//import { FormComponent, ReactWidget } from '@jupyterlab/ui-components';
import { JSONSchema7 } from 'json-schema';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ReactWidget } from './vdom';
import { FormComponent } from './form';


type FormDataProps =
  | IChangeEvent<any, RJSFSchema, any>
  | undefined
  | PartialJSONObject
  | {};

/**
 * Form to select custom properties of kernel
 *
 * @returns The React component



/**
 * A Button Lumino Widget that wraps a FormComponent.
 */
export class DialogWidget extends ReactWidget {
  schema: RJSFSchema;
  formData: FormDataProps | {};
  updateFormData: (formData: FormDataProps) => void;
  kernelConfigurarion: FormDataProps;
  uiSchema: UiSchema;
  trans: IRenderMime.TranslationBundle;
  /**
   * Constructs a new FormWidget.
   */
  constructor(
    schema: RJSFSchema,
    kernelConfigurarion: FormDataProps,
    updateFormData: (formData: FormDataProps) => void,
    trans: IRenderMime.TranslationBundle
  ) {
    super();
    this.schema = schema;
    this.formData = undefined;
    this.kernelConfigurarion = kernelConfigurarion;
    this.updateFormData = updateFormData;
    this.uiSchema = {
      'ui:options': {
        submitButtonOptions: {
          props: {
            disabled: true
          },
          norender: true
        }
      }
    };
    this.trans = trans;
  }

  getValue(): FormDataProps | {} {
    console.log(`kernelConfigurarion`);
    console.dir(this.kernelConfigurarion);
    return this.kernelConfigurarion;
  }

  #checkFormData(formData: FormDataProps) {
    console.log('validate');
    console.log('formData');
    console.dir(formData);
    //let proba: FormDataProps= {};
    if (formData && Object.keys(formData).length) {
      let formDataArr = Object.entries(formData);
      console.log()
      for (const [key, value] of formDataArr) {
        console.log(`key--->${key}`);
        let isValid = this.#validate(value);
        if (isValid) {
          console.log('yes. valid');
        }
      }
    }
    return formData;
  }

  #validate(value: string) {
    const regexp = /^[a-zA-Z0-9]+$/;
    let isValid = false;
    value = value
      .replace(/<script.*?>.*?<\/script>/gi, '')
      .replace(/<.*?javascript:.*?>/gi, '')
      .replace(/<.*? on\w+=.*?>/gi, '');
    if (regexp.test(value)) {
      isValid = true;
    }
    return isValid;
  }

  render(): JSX.Element {
    let formData: Record<string, any> = {};
    for (let kernel_custom_variable in this.schema.properties){
      console.log('kernel_custom_variable new');
      console.log(kernel_custom_variable);
     // formData[kernel_custom_variable] = this.schema.properties[kernel_custom_variable].default || '';
    }
    return (
      <FormComponent
        validator={validator}
        formData={formData}
        schema={this.schema as JSONSchema7}
        uiSchema={this.uiSchema}
        idPrefix={`jp-CustomKernel-test`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          let formData = this.#checkFormData(e.formData || {});
          console.log('checkFormData')
          this.updateFormData(formData);
        }}
        showModifiedFromDefault={false}
      />

    );
  }
}

