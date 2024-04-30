import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useEffect, useState } from 'react';

import Form, { IChangeEvent } from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

/**
 * Form to select custom properties of kernel
 *
 * @returns The React component
 */

const FormComponent = (props: {
  schema: RJSFSchema;
  getFormData: (
    formData: IChangeEvent<any, RJSFSchema, any> | undefined
  ) => void;
}): JSX.Element => {
  const [data, setFormData] = useState<
    IChangeEvent<any, RJSFSchema, any> | undefined
  >(undefined);

  useEffect(() => {
      props.getFormData(data);
  }, [data]);

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
    setFormData(formData);
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
  formData: IChangeEvent<any, RJSFSchema, any> | undefined;
  /**
   * Constructs a new FormWidget.
   */
  constructor(schema: RJSFSchema) {
    super();
    this.schema = schema;
    this.formData = undefined;
  }

  getValue(): IChangeEvent<any, RJSFSchema, any> | undefined {
    return this.formData;
  }

  getFormData(formData: IChangeEvent<any, RJSFSchema, any> | undefined): void {
    console.log(`formData-->${formData}`);
    this.formData = formData;
  }

  render(): JSX.Element {
    return (
      <FormComponent schema={this.schema} getFormData={this.getFormData} />
    );
  }
}
