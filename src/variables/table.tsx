// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { IDebugger } from '../tokens';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { VariablesModel } from './model';

/**VariablesComponent
 * The body for a Va    console.log({ self });riables Panel.
 */
export class VariablesBodyTable extends ReactWidget {
  /**
   * Instantiate a new Body for the Variables Panel.
   * @param model The model for the variables.
   */
  constructor(options: VariablesBodyTable.IOptions) {
    super();
    this._model = options.model;
    this._service = options.service;
    this.addClass('jp-DebuggerVariables-body');
    this._model.changed.connect(this.updateScopes, this);
  }

  private updateScopes(self: VariablesModel) {
    if (ArrayExt.shallowEqual(this._scopes, self.scopes)) {
      return;
    }
    this._scopes = self.scopes;
    this.update();
  }

  /**
   * Render the VariablesComponent.
   */
  render() {
    return (
      <>
        {this._scopes.map(scope => (
          <VariablesComponent
            key={scope.name}
            data={scope.variables}
            model={this._model}
            service={this._service}
          />
        ))}
      </>
    );
  }

  private _model: VariablesModel;
  private _service: IDebugger;
  private _scopes: VariablesModel.IScope[] = [];
}

const VariablesComponent = ({
  data,
  model,
  service
}: {
  data: VariablesModel.IVariable[];
  model: VariablesModel;
  service: IDebugger;
}) => {
  const [variables, setVariables] = useState(data);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    setVariables(data);
  }, [data]);

  const onClickVariable = async (variable: VariablesModel.IVariable) => {
    const variableDetials = await service.getVariableDetails(variable);
    console.log({ variableDetials });
    setSelected(variable.evaluateName);
  };

  const Tbody = () => (
    <tbody>
      {variables?.map(variable => (
        <tr
          onClick={() => onClickVariable(variable)}
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

namespace VariablesBodyTable {
  export interface IOptions {
    model: VariablesModel;
    service: IDebugger;
  }
}
