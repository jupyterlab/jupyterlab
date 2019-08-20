// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, SplitPanel, Widget } from '@phosphor/widgets';

import { IVariablesModel } from '../model';

import { IVariable } from '../variable';

import { VariableTableDescription } from './variableTableDescription';

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
    this.currentVariable = this.model.current;

    this.table = new VariableTableDescription(this.model);
    this.table.addClass('jp-DebuggerSidebarVariable-table');
    this.addWidget(this.table);

    this.descriptionBox = new Panel();
    this.descriptionBox.addClass('jp-DebuggerSidebarVariable-description');

    this.addWidget(this.descriptionBox);
    this.descriptionBox.node.innerHTML = '<b> Select Variable </b>';

    this.model.currentChanged.connect(
      (model: IVariablesModel, variable: IVariable) => {
        this.descriptionBox.node.innerHTML = this.renderDescription(
          this.model.current
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
