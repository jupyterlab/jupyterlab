/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

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
  const renderField = (props: FormComponentRegistry.IRendererProps) => {
    return componentRegistry.getRenderer(
      props.uihints.field_type ?? 'string'
    )?.(props);
  };

  const categorizedInputElements: { [category: string]: any } = {};
  const uncategorizedInputElements = [];
  for (const field in schema) {
    const props = schema[field];
    if (props.uihints?.category) {
      const category = props.uihints.category;
      if (!categorizedInputElements[category.label]) {
        categorizedInputElements[category.label] = [];
      }
      categorizedInputElements[category.label].push(renderField(props));
    } else {
      uncategorizedInputElements.push(renderField(props));
    }
  }
  return (
    <div className={FORM_EDITOR_CLASS}>
      {uncategorizedInputElements}
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
    </div>
  );
};
