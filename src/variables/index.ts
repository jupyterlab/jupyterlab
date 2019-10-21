// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, Widget, PanelLayout } from '@phosphor/widgets';

import { Body } from './body';

import { Signal, ISignal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

export class Variables extends Panel {
  constructor(options: Variables.IOptions = {}) {
    super();

    this.model = new Variables.IModel();
    this.addClass('jp-DebuggerVariables');
    this.title.label = 'Variables';

    const header = new VariablesHeader(this.title.label);
    this.body = new Body(this.model);

    this.addWidget(header);
    this.addWidget(this.body);
  }

  readonly model: Variables.IModel;

  readonly body: Widget;
}

class VariablesHeader extends Widget {
  constructor(title: string) {
    super({ node: document.createElement('header') });
    const layout = new PanelLayout();
    const span = new Widget({ node: document.createElement('span') });

    this.layout = layout;
    span.node.textContent = title;
    layout.addWidget(span);
  }
}

export namespace Variables {
  export interface IVariable extends DebugProtocol.Variable {
    description: string;
  }

  export interface IScope {
    name: string;
    variables: IVariable[];
  }

  export interface IModel {}

  export class IModel implements IModel {
    constructor(model?: IScope[] | null) {
      this._state = model;
      this._currentScope = !!this._state ? this._state[0] : null;
    }

    get currentScope(): IScope {
      return this._currentScope;
    }

    set currentScope(value: IScope) {
      if (this._currentScope === value) {
        return;
      }
      this._currentScope = value;
      const variables = !!value ? value.variables : [];
      this._variablesChanged.emit(variables);
    }

    get currentChanged(): ISignal<this, IVariable> {
      return this._currentChanged;
    }

    get scopesChanged(): ISignal<this, IScope[]> {
      return this._scopesChanged;
    }

    get currentVariable(): IVariable {
      return this._currentVariable;
    }
    set currentVariable(variable: IVariable) {
      if (this._currentVariable === variable) {
        return;
      }
      this._currentVariable = variable;
      this._currentChanged.emit(variable);
    }

    get filter() {
      return this._filterState;
    }
    set filter(value) {
      if (this._filterState === value) {
        return;
      }
      this._filterState = value;
      if (this._currentScope) {
        this._variablesChanged.emit(this._filterVariables());
      }
    }

    get scopes(): IScope[] {
      return this._state;
    }

    set scopes(scopes: IScope[]) {
      this._state = scopes;
      this._scopesChanged.emit(scopes);
      this.currentScope = !!scopes ? scopes[0] : null;
    }

    get variables(): IVariable[] {
      if (this._filterState) {
        return this._filterVariables();
      }
      return this._currentScope ? this._currentScope.variables : [];
    }

    set variables(variables: IVariable[]) {
      this._currentScope.variables = variables;
    }

    get variablesChanged(): ISignal<this, IVariable[]> {
      return this._variablesChanged;
    }

    getCurrentVariables(): IVariable[] {
      return this.variables;
    }

    private _filterVariables(): IVariable[] {
      return this._currentScope.variables.filter(
        ele =>
          ele.name
            .toLocaleLowerCase()
            .indexOf(this._filterState.toLocaleLowerCase()) !== -1
      );
    }

    private _currentVariable: IVariable;
    private _currentChanged = new Signal<this, IVariable>(this);
    private _variablesChanged = new Signal<this, IVariable[]>(this);
    private _filterState: string = '';
    protected _state: IScope[];
    private _currentScope: IScope;
    private _scopesChanged = new Signal<this, IScope[]>(this);
  }

  export interface IOptions extends Panel.IOptions {}
}
