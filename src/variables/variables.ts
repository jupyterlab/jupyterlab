// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel } from '@phosphor/widgets';

import { VariableDescription } from './description';

import { Signal, ISignal } from '@phosphor/signaling';

export class Variables extends Panel {
  constructor() {
    super();

    this.model = Variables.IVariablesModel.create(MOCK_DATA_ROW.variables);

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebarVariables-header');
    this.addWidget(this.header);

    this.label = new Panel();
    this.label.node.textContent = 'Variables';
    this.label.addClass('jp-DebuggerSidebarVariables-header-label');
    this.header.addWidget(this.label);
    this.variablesDescription = new VariableDescription(this.model);
    this.variablesDescription.addClass('jp-DebuggerSidebarVariables-body');
    this.addWidget(this.variablesDescription);
  }

  readonly body: Panel;

  readonly header: Panel;

  readonly label: Panel;

  readonly model: Variables.IVariablesModel;

  readonly searcher: Panel;

  readonly variablesDescription: Panel;
}

export namespace Variables {
  // will be change for DebugProtoclVariable
  export interface IVariable {
    /**
     * The name of this variable.
     */
    readonly name: string;
    /**
     * The value of this variable.
     */
    readonly value: string;
    /**
     * The type of this variable.
     */
    readonly type: string | undefined;
    /**
     * The description of the variable.
     */
    readonly description: string | undefined;
    /**
     * a data URI or null.
     */
    readonly dataUri?: string;
    /**
     * a data URI or null.
     */
    readonly sourceUri?: string;
  }

  export interface IVariablesModel {
    current: IVariable;
    filter: string;
    variables: IVariable[];
    currentChanged: ISignal<Model, IVariable>;
    variablesChanged: ISignal<Model, IVariable[]>;
  }

  export namespace IVariablesModel {
    export function create(model: IVariable[]) {
      return new Model(model);
    }
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

    fstFil(name: string): boolean {
      return (
        this._filterState
          .split('')
          .filter((ele: string, index: number) => name[index] === ele)
          .join('') === this._filterState
      );
    }

    private _filterVariables(): IVariable[] {
      return this._state.filter(ele => this.fstFil(ele.name));
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
      description: 'def test1(): return 0'
    },
    {
      name: 'Classtest',
      value: 'class',
      type: 'class',
      description: 'def test2(): return 0'
    },
    {
      name: 'test 3',
      value: 'function()',
      type: 'function',
      description: 'def test1(): return 0'
    },
    {
      name: 'test 4',
      value: 'function()',
      type: 'function',
      description: 'def test2(): return 0'
    },
    {
      name: 'test 5',
      value: 'function()',
      type: 'function',
      description: 'def test1(): return 0'
    },
    {
      name: 'test 6',
      value: 'function()',
      type: 'function',
      description: 'def test2(): return 0'
    }
  ]
};
