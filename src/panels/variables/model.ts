// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

import { IDebugger } from '../../tokens';

/**
 * A model for a variable explorer.
 */
export class VariablesModel implements IDebugger.Model.IVariables {
  /**
   * Get all the scopes.
   */
  get scopes(): VariablesModel.IScope[] {
    return this._state;
  }

  /**
   * Set the scopes.
   */
  set scopes(scopes: VariablesModel.IScope[]) {
    this._state = scopes;
    this._changed.emit();
  }

  /**
   * Signal emitted when the current variable has changed.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * Signal emitted when the current variable has been expanded.
   */
  get variableExpanded(): ISignal<this, VariablesModel.IVariable> {
    return this._variableExpanded;
  }

  /**
   * Expand a variable.
   *
   * @param variable The variable to expand.
   */
  expandVariable(variable: VariablesModel.IVariable): void {
    this._variableExpanded.emit(variable);
  }

  private _state: VariablesModel.IScope[] = [];
  private _variableExpanded = new Signal<this, VariablesModel.IVariable>(this);
  private _changed = new Signal<this, void>(this);
}

/**
 * A namespace for VariablesModel `statics`.
 */
export namespace VariablesModel {
  /**
   * An interface for a variable.
   */
  export interface IVariable extends DebugProtocol.Variable {
    /**
     * Whether the variable is expanded.
     */
    expanded?: boolean;
  }

  /**
   * An interface for a scope.
   */
  export interface IScope {
    /**
     * The name of the scope.
     */
    name: string;

    /**
     * The list of variables.
     */
    variables: IVariable[];
  }
}
