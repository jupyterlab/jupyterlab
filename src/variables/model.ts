import { IVariable } from './variable';
import { Signal, ISignal } from '@phosphor/signaling';

export interface IVariablesModel {
  filter: string;
  variables: IVariable[];
  changeCurrentVariable: ISignal<Model, IVariable>;
  changeVariables: ISignal<Model, IVariable[]>;
  variable: IVariable;
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

  get changeCurrentVariable(): ISignal<this, IVariable> {
    return this._changeCurrentVariable;
  }

  get changeVariables(): ISignal<this, IVariable[]> {
    return this._changeVariables;
  }

  get variables(): IVariable[] {
    if (this._filterState) {
      return this._filterVariabiles();
    }
    return this._state;
  }

  set variables(variables: IVariable[]) {
    this._state = variables;
  }

  get variable(): IVariable {
    return this._currentVariabile;
  }

  set variable(variable: IVariable) {
    if (this._currentVariabile === variable) {
      return;
    }
    this._currentVariabile = variable;
    this._changeCurrentVariable.emit(variable);
  }

  get filter() {
    return this._filterState;
  }

  set filter(value) {
    if (this._filterState === value) {
      return;
    }
    this._filterState = value;
    this._changeVariables.emit(this._filterVariabiles());
  }

  getCurrentVariables(): IVariable[] {
    return this.variables;
  }

  fstFil = function(item_name: string) {
    return (
      this._filterState
        .split('')
        .filter((ele: string, index: number) => item_name[index] === ele)
        .join('') === this._filterState
    );
  };

  private _filterVariabiles(): IVariable[] {
    return this._state.filter(ele => this.fstFil(ele.name));
  }

  private _currentVariabile: IVariable;
  private _state: IVariable[];
  private _filterState: string = '';
  private _changeCurrentVariable = new Signal<this, IVariable>(this);
  private _changeVariables = new Signal<this, IVariable[]>(this);
}
