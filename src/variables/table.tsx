// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { ArrayExt } from '@phosphor/algorithm';

import React, { useEffect, useState } from 'react';

import { VariablesModel } from './model';

/**
 * The body for a Variables Panel.
 */
export class VariablesBodyTable extends ReactWidget {
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
  const [selected, setSelected] = useState('');

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

  const checkIsSelected = (variable: VariablesModel.IVariable) => {
    if (selected === variable.evaluateName) {
      alert(JSON.stringify(variable));
      return;
    }
    setSelected(variable.evaluateName);
  };

  const Tbody = () => (
    <tbody>
      {data[0]?.variables.map(variable => (
        <tr
          onClick={() => checkIsSelected(variable)}
          key={variable.evaluateName}
        >
          <td>{variable.name}</td>
          <td>{convertType(variable)}</td>
          <td className={selected === variable.evaluateName ? 'selected' : ''}>
            {variable.value}
          </td>
        </tr>
      ))}
    </tbody>
  );

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Value</th>
        </tr>
      </thead>
      {Tbody()}
    </table>
  );
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
      return type;
  }
};
