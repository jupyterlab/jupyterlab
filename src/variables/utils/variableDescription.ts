import { Panel, SplitPanel, Widget } from '@phosphor/widgets';
import { VariableTableDescription } from './variableTableDescription';
import { IVariablesModel } from '../model';
import { IVariable } from '../variable';

export class VariableDescription extends SplitPanel {
  readonly searchParams: Widget;
  readonly table: Widget;
  readonly descriptionBox: Panel;

  model: IVariablesModel;
  currentVariable: any;

  constructor(model: IVariablesModel) {
    super();
    this.orientation = 'vertical';
    this.model = model;
    this.currentVariable = this.model.variable;

    this.table = new VariableTableDescription(this.model);
    this.table.addClass('jp-DebuggerSidebarVariable-table');
    this.addWidget(this.table);

    this.descriptionBox = new Panel();
    this.descriptionBox.addClass('jp-DebuggerSidebarVariable-description');

    this.addWidget(this.descriptionBox);
    this.descriptionBox.node.innerHTML = '<b> Select Variable </b>';

    //observable change current variable
    this.model.changeCurrentVariable.connect(
      (model: IVariablesModel, variable: IVariable) => {
        this.descriptionBox.node.innerHTML = this.renderDescription(
          this.model.variable
        );
      }
    );
  }

  // Still in progres: rendering description

  protected renderDescription(variable: IVariable) {
    const descriptionElementDOM = `<b>name: ${variable.name}</b>
                                       <p>type: ${variable.type} </p>
                                       Description:
                                       <p>${variable.description}</p> `;
    return descriptionElementDOM;
  }
}
