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
import { map, toArray } from '@lumino/algorithm';
import * as React from 'react';
import {
  FormComponentRegistry,
  IFormComponentRegistry
} from './FormComponentRegistry';

const FORM_EDITOR_CLASS = 'jp-formEditor';
export const DIRTY_CLASS = 'jp-mod-dirty';

export interface IFormEditorProps {
  schema: FormEditor.ISchema;
  handleChange: (fieldName: string, value: any) => void;
  componentRegistry: IFormComponentRegistry;
}

export namespace FormEditor {
  export type ISchema = {
    [fieldName: string]: FormComponentRegistry.IRendererProps;
  };

  export type IData = { [fieldName: string]: any };
}

/**
 * Form editor widget
 */
export const FormEditor = ({ schema, componentRegistry }: IFormEditorProps) => {
  const renderField = (
    fieldName: string,
    props: FormComponentRegistry.IRendererProps
  ) => {
    return componentRegistry.getRenderer(
      props.uihints.field_type ?? 'string'
    )?.(props);
  };

  const categorizedInputElements: { [category: string]: any } = {};
  const uncategorizedInputElements = [];
  for (const field in schema) {
    const props = schema[field];
    if (props.uihints.category) {
      const category = props.uihints.category;
      if (!categorizedInputElements[category]) {
        categorizedInputElements[category] = [];
      }
      categorizedInputElements[category].push(renderField(field, props));
    } else {
      uncategorizedInputElements.push(renderField(field, props));
    }
  }
  return (
    <div className={FORM_EDITOR_CLASS}>
      {toArray(
        map(Object.keys(categorizedInputElements), (category: string) => {
          return [
            <h4
              style={{ flexBasis: '100%', padding: '10px' }}
              key={`${category}Category`}
            >
              {category}
            </h4>,
            ...categorizedInputElements[category]
          ];
        })
      )}
      {uncategorizedInputElements}
    </div>
  );
};
