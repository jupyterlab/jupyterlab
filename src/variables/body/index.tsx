// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Variables } from '../index';

import { ITheme, ObjectInspector, ObjectRootLabel } from 'react-inspector';

import { ReactWidget } from '@jupyterlab/apputils';

import { ArrayExt } from '@phosphor/algorithm';

import React, { useEffect, useState } from 'react';

export class Body extends ReactWidget {
  constructor(model: Variables.Model) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerVariables-body');
  }

  model: Variables.Model;

  render() {
    return <VariableComponent model={this.model} />;
  }
}

const VariableComponent = ({ model }: { model: Variables.Model }) => {
  const [data, setData] = useState(model.scopes);

  const filterVariable = (
    variable: Variables.IVariable,
    isObject?: boolean,
    v?: any
  ): Object => {
    const tableKey = ['name', 'value', 'type'];
    const filteredObj = Object.keys(variable)
      .filter(
        key =>
          (isObject ? key === 'value' : tableKey.includes(key)) ||
          (key !== 'presentationHint' &&
            typeof (variable as any)[key] === 'object')
      )
      .reduce((res, key) => {
        let valueOfKey =
          key === 'value' ? convertType(variable) : (variable as any)[key];
        if (typeof valueOfKey === 'object') {
          return Object.assign(res, filterVariable(
            valueOfKey,
            true,
            key
          ) as Object);
        }
        if (isObject) {
          return Object.assign(res, {
            [v]: valueOfKey
          });
        }

        return Object.assign(res, {
          [key]: valueOfKey
        });
      }, {});

    return filteredObj;
  };

  const convertForObjectInspector = (scopes: Variables.IScope[]) => {
    const converted = scopes.map(scope => {
      const newVariable = scope.variables.map(variable => {
        const func = () => {
          model.getMoreDataOfVariable(variable);
        };

        if (variable.haveMoreDetails || variable.variablesReference === 0) {
          return { ...filterVariable(variable) };
        } else {
          return { getMoreDetails: func, ...filterVariable(variable) };
        }
      });
      return { name: scope.name, variables: newVariable };
    });
    return converted;
  };

  useEffect(() => {
    const updateScopes = (self: Variables.Model) => {
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

const convertType = (variable: Variables.IVariable) => {
  const type = variable.type;
  let value: any = variable.value;
  if (type === 'int' || type === 'float') {
    return value * 1;
  }
  if (type === 'bool') {
    return value === 'False' ? false : true;
  }
  if (type === 'str') {
    return (value as string)
      .split('')
      .slice(1, value.length - 1)
      .join('');
  }
  return value;
};

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
  let dontDisplay = false;
  const types = ['bool', 'str', 'int', 'float'];
  const label = data.name === '' || data.name == null ? name : data.name;
  const value = types.includes(data.type)
    ? data.value
    : data.type === 'type'
    ? 'class'
    : data.type;

  if (expanded) {
    if (data.getMoreDetails) {
      data.getMoreDetails();
      dontDisplay = true;
    }
  }

  return dontDisplay ? null : depth === 0 ? (
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
