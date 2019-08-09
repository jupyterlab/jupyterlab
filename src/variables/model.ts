import { IVariable } from './variable';
import { Signal, ISignal } from '@phosphor/signaling';


export interface IVariablesModel {
    changeCurrentVariable: any;
    getCurrentDescription(): string;
    variable: IVariable;

}



export namespace IVariablesModel {
    export function create(model: IVariable[]) {
        return new Model(model);
    }
}

export class Model implements IVariablesModel {
   

    constructor(model: IVariable[]) {
        this.variables = model;
    }

    get changeCurrentVariable(): ISignal<this, IVariable>{
        return this._chenageCurrentVariable;
    }

    get variables(): IVariable[] {
       return this._state;
    }

    set variables(variables: IVariable[]) {
        this._state = variables;
    }

    get variable(): IVariable {
        return this._currentVariabile;
    }

    set variable(variable: IVariable) {
        if(this._currentVariabile === variable) {
            return
        }
        this._currentVariabile = variable;
        this._chenageCurrentVariable.emit(variable);
    }

    getCurrentVariables(): IVariable[] {
        return this.variables;
    }

    getCurrentDescription(): IVariable["description"] {
        return (this.variable)? this.variable.description:'none';
    }

  

    private _currentVariabile: IVariable;
    private _state: IVariable[];
    private _chenageCurrentVariable = new Signal<this , IVariable>(this);


}
