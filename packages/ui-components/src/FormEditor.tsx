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
  /**
   * Schema maps the field ID's to renderer props.
   */
  schema: FormEditor.ISchema;

  /**
   * Callback for edits made to a given field.
   */
  handleChange: (fieldName: string, value: any) => void;

  /**
   * Registry to access renderers for the editor.
   */
  componentRegistry: IFormComponentRegistry;
}

export namespace FormEditor {
  /**
   * Simple schema mapping field ID to props for renderer.
   */
  export type ISchema = {
    [fieldName: string]: FormComponentRegistry.IRendererProps;
  };
}

/**
 * React component that renders a list of fields given a schema and
 * a registry for accessing renderers.
 */
export const FormEditor = ({ schema, componentRegistry }: IFormEditorProps) => {
  const renderField = (props: FormComponentRegistry.IRendererProps) => {
    return componentRegistry.getRenderer(props.uihints.type ?? 'string')?.(
      props
    );
  };

  /**
   * Split up the categorized and uncategorized fields (category is in uihints),
   * and use category dictionary to render category label as heading.
   */
  const categorizedInputElements: { [category: string]: any } = {};
  const uncategorizedInputElements = [];
  for (const field in schema) {
    const props = schema[field];
    if (props.uihints?.category) {
      const category = props.uihints.category;
      if (!categorizedInputElements[category.label]) {
        categorizedInputElements[category.label] = [];
      }
      categorizedInputElements[category.label].push(
        <div key={`${category.id}.${field}`}>{renderField(props)}</div>
      );
    } else {
      uncategorizedInputElements.push(
        <div key={`${field}`}>{renderField(props)}</div>
      );
    }
  }
  return (
    <div className={FORM_EDITOR_CLASS}>
      {uncategorizedInputElements}
      {toArray(
        map(Object.keys(categorizedInputElements), (category: string) => {
          return [
            <h2 key={`${category}Category`}>{category}</h2>,
            ...categorizedInputElements[category]
          ];
        })
      )}
    </div>
  );
};
