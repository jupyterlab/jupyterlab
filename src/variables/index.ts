// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, Widget, PanelLayout } from '@phosphor/widgets';

import { Body } from './body';

import { Signal, ISignal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

export class Variables extends Panel {
  constructor(options: Variables.IOptions = {}) {
    super();

    this.model = new Variables.IModel(MOCK_DATA_ROW.scopes);
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
    constructor(model: IScope[]) {
      this._state = model;
      this._currentScope = this._state[0];
    }

    get currentScope(): IScope {
      return this._currentScope;
    }

    set currentScope(value: IScope) {
      if (this._currentScope === value) {
        return;
      }
      this._currentScope = value;
      this._variablesChanged.emit(value.variables);
    }

    get currentChanged(): ISignal<this, IVariable> {
      return this._currentChanged;
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
      this._variablesChanged.emit(this._filterVariables());
    }

    get scopes(): IScope[] {
      return this._state;
    }

    get variables(): IVariable[] {
      if (this._filterState) {
        return this._filterVariables();
      }
      return this._currentScope.variables;
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
  }

  export interface IOptions extends Panel.IOptions {}
}

const MOCK_DATA_ROW = {
  scopes: [
    {
      name: 'local',
      variables: [
        {
          name: 'test 1',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def test1(): return 0'
        },
        {
          name: 'Classtest',
          value: 'class',
          type: 'class',
          variablesReference: 1,
          description: 'def test2(): return 0'
        },
        {
          name: 'test 3',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def test1(): return 0'
        },
        {
          name: 'test 4',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def test2(): return 0'
        },
        {
          name: 'test 5',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def test1(): return 0'
        },
        {
          name: 'test 6',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def test2(): return 0'
        }
      ]
    },
    {
      name: 'global',
      variables: [
        {
          name: 'exampleGlobal',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def exampleGlobal(): return 0'
        }
      ] as Variables.IVariable[]
    },
    {
      name: 'built-in',
      variables: [
        {
          name: 'exmapleBuiltIn',
          value: 'function()',
          type: 'function',
          variablesReference: 0,
          description: 'def texmapleBuiltIn(): return 0'
        }
      ] as Variables.IVariable[]
    }
  ]
};
