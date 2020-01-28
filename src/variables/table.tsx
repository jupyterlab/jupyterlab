// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { IDebugger } from '../tokens';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { VariablesModel } from './model';

import { Variables } from '.';

/**VariablesComponent
 * The body for a Variables Panel.
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
    this._commands = options.commands;
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
            service={this._service}
            commands={this._commands}
          />
        ))}
      </>
    );
  }

  private _model: VariablesModel;
  private _service: IDebugger;
  private _scopes: VariablesModel.IScope[] = [];
  private _commands: Variables.ICommands;
}

export class VariableTest extends ReactWidget {
  constructor(options: VariablesTest.IOptions) {
    super();
    const { details, service, commands, model } = options;
    this._variables = details;
    this._service = service;
    this._commands = commands;
    this._model = model;
    this._model.changed.connect(this.updateScopes, this);
  }

  private updateScopes(self: VariablesModel) {
    this.dispose();
  }

  render() {
    return (
      <VariablesComponent
        data={this._variables}
        service={this._service}
        commands={this._commands}
      />
    );
  }

  private _variables: VariablesModel.IVariable[] = [];
  private _service: IDebugger;
  private _commands: Variables.ICommands;
  private _model: VariablesModel;
}

const VariablesComponent = ({
  data,
  service,
  commands
}: {
  data: VariablesModel.IVariable[];
  service: IDebugger;
  commands?: Variables.ICommands;
}) => {
  const [variables, setVariables] = useState(data);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setVariables(data);
  }, [data]);

  const onClickVariable = async (variable: VariablesModel.IVariable) => {
    if (selected === variable) {
      setSelected(null);
      return;
    }
    setSelected(variable);
    await commands.registry.execute(commands.details, {
      variableReference: variable.variablesReference,
      title: variable.evaluateName
    });
  };

  const Tbody = (variables: VariablesModel.IVariable[]) => (
    <tbody>
      {variables?.map(variable => (
        <tr
          onClick={() => onClickVariable(variable)}
          key={variable.evaluateName}
        >
          <td>{variable.name}</td>
          <td>{convertType(variable)}</td>
          <td className={selected === variable ? 'selected' : ''}>
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
      {Tbody(variables)}
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
    commands: Variables.ICommands;
  }
}

namespace VariablesTest {
  export interface IOptions {
    model?: VariablesModel;
    service: IDebugger;
    details: VariablesModel.IVariable[];
    commands: Variables.ICommands;
  }
}
