// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Variables } from '../index';

import { ObjectInspector, ObjectLabel } from 'react-inspector';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useState, useEffect } from 'react';
import { ArrayExt } from '@phosphor/algorithm';

export class Body extends ReactWidget {
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerVariables-body');
  }

  model: Variables.IModel;

  render() {
    return <VariableComponent model={this.model} />;
  }
}

const defaultNodeRenderer = ({
  depth,
  name,
  data,
  isNonenumerable,
  expanded
}: {
  depth: number;
  name: string;
  data: any;
  isNonenumerable: boolean;
  expanded: boolean;
}) => {
  const label = data.name === '' || data.name == null ? name : data.name;
  const value = data.value;

  return depth === 0 ? (
    <span>
      <span>{label}</span>
      <span>:</span>
      <span>{data.length}</span>
    </span>
  ) : depth === 1 ? (
    <span>
      <span style={{ color: 'rgb(136, 19, 145)' }}>{label}</span>
      <span>:</span>
      <span>{value}</span>
    </span>
  ) : (
    <ObjectLabel name={label} data={data} isNonenumerable={isNonenumerable} />
  );
};

const VariableComponent = ({ model }: { model: Variables.IModel }) => {
  const [data, setData] = useState(model.scopes);

  useEffect(() => {
    const updateScopes = (_: Variables.IModel, update: Variables.IScope[]) => {
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
        />
      ))}
    </>
  );

  return <>{List()}</>;
};
