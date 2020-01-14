// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

/**
 * A model for a variable explorer.
 */
export class VariablesModel {
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

  set details(variables: VariablesModel.IVariable[]) {
    console.log({ variables });
    this._details = variables;
  }

  get details(): VariablesModel.IVariable[] {
    return this._details;
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

  get variableCliked(): ISignal<this, VariablesModel.IVariable> {
    return this._variableCliked;
  }

  /**
   * Expand a variable.
   * @param variable The variable to expand.
   */
  expandVariable(variable: VariablesModel.IVariable) {
    this._variableExpanded.emit(variable);
  }

  variableGetDetails(variable: VariablesModel.IVariable) {
    this._variableCliked.emit(variable);
  }

  private _state: VariablesModel.IScope[] = [];
  private _variableExpanded = new Signal<this, VariablesModel.IVariable>(this);
  private _variableCliked = new Signal<this, VariablesModel.IVariable>(this);
  private _changed = new Signal<this, void>(this);
  private _details: VariablesModel.IVariable[];
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
