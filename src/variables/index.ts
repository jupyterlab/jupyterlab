// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, PanelLayout, Widget } from '@phosphor/widgets';

import { Body } from './body';

import { ISignal, Signal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

export class Variables extends Panel {
  constructor(options: Variables.IOptions) {
    super();

    this.model = options.model;
    this.addClass('jp-DebuggerVariables');
    this.title.label = 'Variables';

    this.header = new VariablesHeader(this.title.label);
    this.body = new Body(this.model);

    this.addWidget(this.header);
    this.addWidget(this.body);
  }

  readonly model: Variables.Model;
  readonly header: VariablesHeader;
  readonly body: Widget;

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this.resizeBody(msg);
  }

  private resizeBody(msg: Widget.ResizeMessage) {
    const height = msg.height - this.header.node.offsetHeight;
    this.body.node.style.height = `${height}px`;
  }
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
    getMoreDetails?: any;
    haveMoreDetails?: Symbol;
  }

  export interface IScope {
    name: string;
    variables: IVariable[];
  }

  export class Model {
    constructor(model: IScope[] = []) {
      this._state = DEMO_DATA;
    }

    get changed(): ISignal<this, void> {
      return this._changed;
    }

    get currentVariable(): IVariable {
      return this._currentVariable;
    }

    set currentVariable(variable: IVariable) {
      if (this._currentVariable === variable) {
        return;
      }

      variable.haveMoreDetails = Symbol('haveDetails');
      this._currentVariable = variable;
      this._currentChanged.emit(variable);

      const newScope = this.scopes.map(scope => {
        const findIndex = scope.variables.findIndex(
          ele => ele.variablesReference === variable.variablesReference
        );
        scope.variables[findIndex] = variable;
        return { ...scope };
      });
      this.scopes = [...newScope];
    }

    get scopes(): IScope[] {
      return this._state;
    }

    set scopes(scopes: IScope[]) {
      this._state = scopes;
      this._changed.emit();
    }

    get variables(): IVariable[] {
      return this._currentScope ? this._currentScope.variables : [];
    }

    set variables(variables: IVariable[]) {
      this._currentScope.variables = variables;
      this._changed.emit();
    }

    get variableExpanded(): ISignal<this, IVariable> {
      return this._variableExpanded;
    }

    getCurrentVariables(): IVariable[] {
      return this.variables;
    }

    getMoreDataOfVariable(variable: IVariable) {
      this._variableExpanded.emit(variable);
    }

    protected _state: IScope[];

    private _currentVariable: IVariable;
    private _currentScope: IScope;

    private _currentChanged = new Signal<this, IVariable>(this);
    private _variableExpanded = new Signal<this, IVariable>(this);
    private _changed = new Signal<this, void>(this);
  }

  export interface IOptions extends Panel.IOptions {
    model: Model;
  }
}

const DEMO_DATA = [
  {
    name: 'Locals',
    variables: [
      {
        evaluateName: 'Person',
        name: 'Person',
        type: 'type',
        value: "<class '__main__.Person'>",
        variablesReference: 11
      },
      {
        evaluateName: 'display',
        name: 'display',
        type: 'builtin_function_or_method',
        value:
          '<built-in method display of PyCapsule object at 0x7f5678c0f4b0>',
        variablesReference: 4
      },
      {
        evaluateName: 'p1',
        name: 'p1',
        type: 'Person',
        value: '<__main__.Person object at 0x7f565c73b0b8>',
        variablesReference: 13,
        'p1.name': {
          evaluateName: 'p1.name',
          name: 'name',
          type: 'str',
          presentationHint: {
            attributes: ['rawString']
          },
          value: 'John',
          variablesReference: 0
        },
        'p1.age': {
          evaluateName: 'p1.age',
          name: 'age',
          type: 'int',
          presentationHint: {
            attributes: ['rawString']
          },
          value: 35,
          variablesReference: 0
        }
      },
      {
        evaluateName: 'ptvsd',
        name: 'ptvsd',
        type: 'module',
        value:
          "<module 'ptvsd' from '/home/codete-bp/anaconda3/envs/jupyterlab-debugger/lib/python3.7/site-packages/ptvsd/__init__.py'>",
        variablesReference: 5
      },
      {
        evaluateName: '_pydev_stop_at_break',
        name: '_pydev_stop_at_break',
        type: 'function',
        value: '<function _pydev_stop_at_break at 0x7f5674c37c80>',
        variablesReference: 12
      },
      {
        evaluateName: '__annotations__',
        name: '__annotations__',
        type: 'dict',
        value: '{}',
        variablesReference: 6
      },
      {
        evaluateName: '__builtins__',
        name: '__builtins__',
        type: 'module',
        value: "<module 'builtins' (built-in)>",
        variablesReference: 7
      },
      {
        evaluateName: '__doc__',
        name: '__doc__',
        type: 'NoneType',
        value: 'None',
        variablesReference: 0
      },
      {
        evaluateName: '__loader__',
        name: '__loader__',
        type: 'type',
        value: "<class '_frozen_importlib.BuiltinImporter'>",
        variablesReference: 8
      },
      {
        evaluateName: '__name__',
        name: '__name__',
        presentationHint: {
          attributes: ['rawString']
        },
        type: 'str',
        value: "'__main__'",
        variablesReference: 0
      },
      {
        evaluateName: '__package__',
        name: '__package__',
        type: 'NoneType',
        value: 'None',
        variablesReference: 0
      },
      {
        evaluateName: '__spec__',
        name: '__spec__',
        type: 'NoneType',
        value: 'None',
        variablesReference: 0
      }
    ]
  }
];
