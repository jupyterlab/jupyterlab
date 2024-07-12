// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { IDebugger } from '../../tokens';

/**
 * A model for a variable explorer.
 */
export class VariablesModel implements IDebugger.Model.IVariables {
  /**
   * Get all the scopes.
   */
  get scopes(): IDebugger.IScope[] {
    return this._state;
  }

  /**
   * Set the scopes.
   */
  set scopes(scopes: IDebugger.IScope[]) {
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
  get variableExpanded(): ISignal<this, IDebugger.IVariable> {
    return this._variableExpanded;
  }

  get selectedVariable(): IDebugger.IVariableSelection | null {
    return this._selectedVariable;
  }
  set selectedVariable(selection: IDebugger.IVariableSelection | null) {
    this._selectedVariable = selection;
  }

  /**
   * Expand a variable.
   *
   * @param variable The variable to expand.
   */
  expandVariable(variable: IDebugger.IVariable): void {
    this._variableExpanded.emit(variable);
  }

  private _selectedVariable: IDebugger.IVariableSelection | null = null;
  private _state: IDebugger.IScope[] = [];
  private _variableExpanded = new Signal<this, IDebugger.IVariable>(this);
  private _changed = new Signal<this, void>(this);
}
