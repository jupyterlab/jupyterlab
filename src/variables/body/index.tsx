// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Variables } from '../index';

import { ObjectInspector, ObjectLabel, ITheme } from 'react-inspector';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useState, useEffect } from 'react';
import { ArrayExt } from '@phosphor/algorithm';

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

  useEffect(() => {
    const updateScopes = (_: Variables.Model, update: Variables.IScope[]) => {
      if (ArrayExt.shallowEqual(data, update)) {
        return;
      }
      setData(update);
    };

    model.scopesChanged.connect(updateScopes);

    return () => {
      model.scopesChanged.disconnect(updateScopes);
    };
  });

  const List = () => (
    <>
      {data.map(scopes => (
        <ObjectInspector
          key={scopes.name}
          data={scopes.variables}
          name={scopes.name}
          nodeRenderer={defaultNodeRenderer}
          theme={THEME}
          expandLevel={1}
        />
      ))}
    </>
  );

  return <>{List()}</>;
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
  const label = data.name === '' || data.name == null ? name : data.name;
  const value = data.value;

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
      <span>{value}</span>
    </span>
  ) : (
    <ObjectLabel name={label} data={data} isNonenumerable={isNonenumerable} />
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
