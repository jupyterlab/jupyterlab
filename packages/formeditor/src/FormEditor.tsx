/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as React from 'react';
import { FormComponentRegistry, IFormComponentRegistry } from './FormComponentRegistry';

const FORM_EDITOR_CLASS = 'jp-formEditor';
export const DIRTY_CLASS = 'jp-mod-dirty';

export interface IFormEditorProps {
  schema: FormEditor.ISchema;
  initialData: FormEditor.IData;
  handleChange: (fieldName: string, value: any) => void;
  componentRegistry: IFormComponentRegistry;
}

export namespace FormEditor {
  export type ISchema = { [category: string]: ICategory };

  export type ICategory = { [fieldName: string]: FormComponentRegistry.IRendererProps };

  export type IData = { [fieldName: string]: any };
}

/**
 * Form editor widget
 */
export const FormEditor =
  ({
    schema,
    initialData,
    handleChange,
    componentRegistry
  }: IFormEditorProps) => {
  const renderField = (fieldName: string, props: FormComponentRegistry.IRendererProps) => {
    let uihints = props.uihints;
    uihints = {
      ...props,
      ...uihints
    };
    return componentRegistry.getRenderer(uihints.field_type ?? 'string')?.({
      value: initialData[fieldName],
      handleChange: (value: any) => {
        handleChange(fieldName, value);
      },
      uihints
    });
  }

  const inputElements = [];
  for (const category in schema) {
    if (category !== '_noCategory') {
      inputElements.push(
        <h4
          style={{ flexBasis: '100%', padding: '10px' }}
          key={`${category}Category`}
        >
          {category}
        </h4>
      );
    }
    for (const schemaProperty in schema[category]) {
      inputElements.push(renderField(schemaProperty, schema[category][schemaProperty]));
    }
  }
  return (
    <div className={FORM_EDITOR_CLASS}>
      {inputElements}
    </div>
  );
}
