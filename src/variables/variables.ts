// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel } from '@phosphor/widgets';

import { VariableDescription } from './description';

import { Signal, ISignal } from '@phosphor/signaling';
import { DebugProtocol } from 'vscode-debugprotocol';

export class Variables extends Panel {
  constructor() {
    super();

    this.model = new Variables.Model(MOCK_DATA_ROW.variables);

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebar-item-header');
    this.addWidget(this.header);

    this.label = new Panel();
    this.label.node.textContent = 'Variables';
    this.label.addClass('jp-DebuggerSidebar-item-header-label');
    this.header.addWidget(this.label);
    this.variablesDescription = new VariableDescription(this.model);
    this.variablesDescription.addClass('jp-DebuggerSidebarVariables-body');
    this.addWidget(this.variablesDescription);
  }

  readonly body: Panel;

  readonly header: Panel;

  readonly label: Panel;

  readonly model: Variables.Model;

  readonly searcher: Panel;

  readonly variablesDescription: Panel;
}

export namespace Variables {
  // will be change for DebugProtoclVariable
  export interface IVariable extends DebugProtocol.Variable {
    description: string;
  }

  export interface IVariablesModel {
    current: IVariable;
    filter: string;
    variables: IVariable[];
    currentChanged: ISignal<Model, IVariable>;
    variablesChanged: ISignal<Model, IVariable[]>;
  }

  export class Model implements IVariablesModel {
    constructor(model: IVariable[]) {
      this._state = model;
    }

    get currentChanged(): ISignal<this, IVariable> {
      return this._currentChanged;
    }

    get current(): IVariable {
      return this._current;
    }
    set current(variable: IVariable) {
      if (this._current === variable) {
        return;
      }
      this._current = variable;
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

    get variables(): IVariable[] {
      if (this._filterState) {
        return this._filterVariables();
      }
      return this._state;
    }
    set variables(variables: IVariable[]) {
      this._state = variables;
    }

    get variablesChanged(): ISignal<this, IVariable[]> {
      return this._variablesChanged;
    }

    getCurrentVariables(): IVariable[] {
      return this.variables;
    }

    private _filterVariables(): IVariable[] {
      return this._state.filter(
        ele => ele.name.indexOf(this._filterState) !== -1
      );
    }

    private _current: IVariable;
    private _currentChanged = new Signal<this, IVariable>(this);
    private _variablesChanged = new Signal<this, IVariable[]>(this);
    private _filterState: string = '';
    private _state: IVariable[];
  }
}

const MOCK_DATA_ROW = {
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
};
