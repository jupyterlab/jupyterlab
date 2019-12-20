// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { ArrayExt } from '@phosphor/algorithm';

import { ITheme, ObjectInspector, ObjectRootLabel } from 'react-inspector';

import React, { useEffect, useState } from 'react';

import { VariablesModel } from './model';

/**
 * The body for a Variables Panel.
 */
export class VariablesBody extends ReactWidget {
  /**
   * Instantiate a new Body for the Variables Panel.
   * @param model The model for the variables.
   */
  constructor(model: VariablesModel) {
    super();
    this._model = model;
    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Render the VariablesComponent.
   */
  render() {
    return <VariablesComponent model={this._model} />;
  }

  private _model: VariablesModel;
}

/**
 * A React component to display a list of variables.
 * @param model The model for the variables.
 */
const VariablesComponent = ({ model }: { model: VariablesModel }) => {
  const [data, setData] = useState(model.scopes);

  // TODO: this should be simplified and extracted from the component
  const filterVariable = (
    variable: VariablesModel.IVariable,
    isObject?: boolean,
    keyObj?: string
  ): Object => {
    const tableKey = ['name', 'value', 'type'];
    const filteredObj = Object.keys(variable)
      .filter(key => {
        if (isObject && key === 'value') {
          return true;
        }
        if (tableKey.includes(key)) {
          return true;
        }
        if (
          typeof (variable as any)[key] === 'object' &&
          key !== 'presentationHint'
        ) {
          return true;
        }
        return false;
      })
      .reduce((res, key) => {
        let valueOfKey =
          key === 'value' ? convertType(variable) : (variable as any)[key];
        if (typeof valueOfKey === 'object') {
          return { ...res, ...filterVariable(valueOfKey, true, key) };
        }
        if (isObject) {
          return { ...res, [keyObj]: valueOfKey };
        }

        return {
          ...res,
          [key]: valueOfKey
        };
      }, {});

    return filteredObj;
  };

  const convertForObjectInspector = (scopes: VariablesModel.IScope[]) => {
    return scopes.map(scope => {
      const newVariable = scope.variables.map(variable => {
        if (variable.expanded || variable.variablesReference === 0) {
          return { ...filterVariable(variable) };
        } else {
          return {
            expandVariable: () => model.expandVariable(variable),
            ...filterVariable(variable)
          };
        }
      });
      return { name: scope.name, variables: newVariable };
    });
  };

  useEffect(() => {
    const updateScopes = (self: VariablesModel) => {
      if (ArrayExt.shallowEqual(data, self.scopes)) {
        return;
      }
      setData(self.scopes);
    };

    model.changed.connect(updateScopes);

    return () => {
      model.changed.disconnect(updateScopes);
    };
  });

  const List = () => (
    <>
      {convertForObjectInspector(data).map(scope => (
        <ObjectInspector
          key={scope.name}
          data={scope.variables}
          name={scope.name}
          nodeRenderer={defaultNodeRenderer}
          theme={THEME}
          expandLevel={1}
        />
      ))}
    </>
  );

  return <>{List()}</>;
};

/**
 * Convert a variable to a primitive type.
 * @param variable The variable.
 */
const convertType = (variable: VariablesModel.IVariable) => {
  const { type, value } = variable;
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'bool':
      return value === 'False' ? false : true;
    case 'str':
      return value.slice(1, value.length - 1);
    default:
      return value;
  }
};

/**
 * Default renderer for the variable tree view.
 */
const defaultNodeRenderer = ({
  depth,
  name,
  data,
  isNonenumerable,
  expanded,
  theme
}: {
  depth: number;
  name: string;
  data: any;
  isNonenumerable: boolean;
  expanded: boolean;
  theme?: string | Partial<ITheme>;
}) => {
  const types = ['bool', 'str', 'int', 'float'];
  const label = data.name === '' || data.name == null ? name : data.name;
  const value = types.includes(data.type) ? data.value : data.type;

  useEffect(() => {
    if (!expanded || !data.expandVariable) {
      return;
    }
    data.expandVariable();
  });

  return depth === 0 ? (
    <span>
      <span>{label}</span>
      <span>: </span>
      <span>{data.length}</span>
    </span>
  ) : depth === 1 ? (
    <span>
      <span style={{ color: THEME.OBJECT_NAME_COLOR }}>{label}</span>
      <span>: </span>
      <span style={{ color: THEME.OBJECT_VALUE_STRING_COLOR }}>{value}</span>
    </span>
  ) : (
    <ObjectRootLabel name={name} data={data} />
  );
};

/**
 * Default theme for the variable tree view.
 */
const THEME = {
  BASE_FONT_FAMILY: 'var(--jp-code-font-family)',
  BASE_FONT_SIZE: 'var(--jp-code-font-size)',
  BASE_LINE_HEIGHT: 'var(--jp-code-line-height)',

  BASE_BACKGROUND_COLOR: 'var(--jp-layout-color1)',
  BASE_COLOR: 'var(--jp-content-font-color1)',

  OBJECT_NAME_COLOR: 'var(--jp-mirror-editor-attribute-color)',
  OBJECT_VALUE_NULL_COLOR: 'var(--jp-mirror-editor-builtin-color)',
  OBJECT_VALUE_UNDEFINED_COLOR: 'var(--jp-mirror-editor-builtin-color)',
  OBJECT_VALUE_REGEXP_COLOR: 'var(--jp-mirror-editor-string-color)',
  OBJECT_VALUE_STRING_COLOR: 'var(--jp-mirror-editor-string-color)',
  OBJECT_VALUE_SYMBOL_COLOR: 'var(--jp-mirror-editor-operator-color)',
  OBJECT_VALUE_NUMBER_COLOR: 'var(--jp-mirror-editor-number-color)',
  OBJECT_VALUE_BOOLEAN_COLOR: 'var(--jp-mirror-editor-builtin-color))',
  OBJECT_VALUE_FUNCTION_KEYWORD_COLOR: 'var(--jp-mirror-editor-def-color))',

  ARROW_COLOR: 'var(--jp-content-font-color2)',
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,

  TREENODE_FONT_FAMILY: 'var(--jp-code-font-family)',
  TREENODE_FONT_SIZE: 'var(--jp-code-font-size)',
  TREENODE_LINE_HEIGHT: 'var(--jp-code-line-height)',
  TREENODE_PADDING_LEFT: 12
};
