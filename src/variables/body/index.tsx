// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Variables } from '../index';

import { ObjectInspector, ObjectLabel } from 'react-inspector';

import { ReactWidget } from '@jupyterlab/apputils';

import React from 'react';

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
  const data = model.currentScope;
  return (
    <ObjectInspector
      data={data.variables}
      name={data.name}
      nodeRenderer={defaultNodeRenderer}
    />
  );
};
