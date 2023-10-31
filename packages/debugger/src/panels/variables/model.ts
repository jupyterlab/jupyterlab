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
  get variableExpanded(): ISignal<this, IDebugger.Model.IVariableContext> {
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
   * @deprecated This is a no-op
   */
  expandVariable(variable: IDebugger.IVariable): void {
    // no-op
  }

  /**
   * Toggle variable expansion state.
   *
   * @param context The variable context.
   */
  toggleVariableExpansion(context: IDebugger.Model.IVariableContext): void {
    let scope = this.scopes.find(scope => scope.name === context.scope);
    if (!scope) {
      scope = { name: context.scope, variables: [] };
      this.scopes.push(scope);
    }

    const parents = context.parents ?? [];
    let container = scope.variables;
    for (let deep = 0; deep < parents.length; deep++) {
      const parent = container.find(item => item.name === parents[deep]);
      if (!parent) {
        return;
      }
      if (typeof parent.children === 'undefined') {
        parent.children = [];
      }
      container = parent.children;
    }
    const expandingItem = container.find(
      item => item.name === context.variable.name
    );
    if (!expandingItem) {
      return;
    }

    expandingItem.expanded = !expandingItem.expanded;
    if (expandingItem.expanded === true) {
      // Variable expanded will set new scopes through `DebuggerService._onVariableExpanded`.
      this._variableExpanded.emit(context);
    }
    this._changed.emit();
  }

  private _selectedVariable: IDebugger.IVariableSelection | null = null;
  private _state: IDebugger.IScope[] = [];
  private _variableExpanded = new Signal<
    this,
    IDebugger.Model.IVariableContext
  >(this);
  private _changed = new Signal<this, void>(this);
}
