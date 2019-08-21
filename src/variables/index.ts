// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, Widget, PanelLayout, SplitPanel } from '@phosphor/widgets';

import { VariablesBody } from './description';

import { Signal, ISignal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

export class Variables extends Panel {
  constructor(options: Variables.IOptions = {}) {
    super();

    this.model = new Variables.IModel(MOCK_DATA_ROW.variables);
    this.addClass('jp-DebuggerVariables');
    this.title.label = 'Variables';

    const header = new VariablesHeader(this.title.label);
    this.body = new VariablesBody(this.model);

    this.addWidget(header);
    this.addWidget(this.body);
  }

  readonly model: Variables.IModel;

  readonly body: SplitPanel;
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

  export interface IModel {}

  export class IModel implements IModel {
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

  export interface IOptions extends Panel.IOptions {}
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
