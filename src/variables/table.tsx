// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { VariablesModel } from './model';

import { IDebugger } from '../tokens';

import { CommandIDs } from '..';

import { CommandRegistry } from '@lumino/commands';

/**
 * The body for a table of variables.
 */
export class VariablesBodyTable extends ReactWidget {
  /**
   * Instantiate a new Body for the table of variables.
   * @param options The instantiation options for a VariablesBodyTable.
   */
  constructor(options: VariablesBodyTable.IOptions) {
    super();
    this._model = options.model;
    this._commands = options.commands;
    this.addClass('jp-DebuggerVariables-body');
    this._model.changed.connect(this.updateScopes, this);
  }

  private updateScopes(model: VariablesModel) {
    if (ArrayExt.shallowEqual(this._scopes, model.scopes)) {
      return;
    }
    this._scopes = model.scopes;
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
            commands={this._commands}
          />
        ))}
      </>
    );
  }

  private _model: VariablesModel;
  private _scopes: VariablesModel.IScope[] = [];
  private _commands: CommandRegistry;
}

/**
 * The body for table of detail's selected Variable.
 */
export class VariableDetails extends ReactWidget {
  /**
   * Instantiate a new Body for the detail's table of selected Variable.
   * @param options The instantiation options for a VariableDetails.
   */
  constructor(options: VariablesDetails.IOptions) {
    super();
    const { details, commands, model, service, title } = options;

    this.title.iconClass = 'jp-VariableIcon';
    this.addClass('jp-DebuggerVariableDetails');
    this.title.label = `${service.session?.connection?.name} - details of ${title}`;

    this._variables = details;
    this._commands = commands;
    this._model = model;
    this._model.changed.connect(this.updateScopes, this);
  }

  private updateScopes() {
    this.dispose();
  }

  /**
   * Render the VariablesComponent.
   */
  render() {
    return (
      <VariablesComponent data={this._variables} commands={this._commands} />
    );
  }

  private _variables: VariablesModel.IVariable[] = [];
  private _commands: CommandRegistry;
  private _model: VariablesModel;
}

/**
 * A React component to display table of variables.
 * @param data array of variables.
 * @param service service of Debugger
 */
const VariablesComponent = ({
  data,
  commands
}: {
  data: VariablesModel.IVariable[];
  commands: CommandRegistry;
}) => {
  const [variables, setVariables] = useState(data);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setVariables(data);
  }, [data]);

  const onVariableClicked = (variable: VariablesModel.IVariable) => {
    if (selected === variable) {
      return;
    }
    setSelected(variable);
  };

  const onVariableDoubleClicked = async (
    variable: VariablesModel.IVariable
  ) => {
    setSelected(variable);
    await commands.execute(CommandIDs.addDetails, {
      variableReference: variable.variablesReference,
      title: variable.evaluateName
    });
  };

  const Tbody = (variables: VariablesModel.IVariable[]) => (
    <tbody>
      {variables?.map(variable => (
        <tr
          onDoubleClick={() => onVariableDoubleClicked(variable)}
          onClick={() => onVariableClicked(variable)}
          key={variable.evaluateName}
        >
          <td>{variable.name}</td>
          <td>{variable.type}</td>
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
 * A namespace for VariablesBodyTable `statics`.
 */
namespace VariablesBodyTable {
  /**
   * Instantiation options for `VariablesBodyTable`.
   */
  export interface IOptions {
    /**
     * The model of Variables.
     */
    model: VariablesModel;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
  }
}

/**
 * A namespace for VariablesDetails `statics`.
 */
namespace VariablesDetails {
  /**
   * Instantiation options for `VariablesDetails`.
   */
  export interface IOptions {
    /**
     * The model of Variables.
     */
    model: VariablesModel;
    /**
     * The details of selected variable.
     */
    details: VariablesModel.IVariable[];
    /**
     * The service of debugger.
     */
    service: IDebugger;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
    /**
     * The name of selected variable.
     */
    title: string;
  }
}
