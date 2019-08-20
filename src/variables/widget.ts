// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel } from '@phosphor/widgets';

import { IVariablesModel } from './model';

import { VariableDescription } from './utils';

const MOCK_DATA_ROW = {
  variables: [
    {
      name: 'test 1',
      value: 'function()',
      type: 'function',
      description: 'def test1(): return 0'
    },
    {
      name: 'test 2',
      value: 'function()',
      type: 'function',
      description: 'def test2(): return 0'
    }
  ]
};

export class VariablesWidget extends Panel {
  constructor() {
    super();

    this.model = IVariablesModel.create(MOCK_DATA_ROW.variables);

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebarVariables-header');
    this.addWidget(this.header);

    this.label = new Panel();
    this.label.node.textContent = 'Variables';
    this.label.addClass('jp-DebuggerSidebarVariables-header-label');
    this.header.addWidget(this.label);

    this.variables = new VariableDescription(this.model);
    this.variables.addClass('jp-DebuggerSidebarVariables-body');
    this.addWidget(this.variables);
  }

  readonly body: Panel;

  readonly header: Panel;

  readonly label: Panel;

  readonly model: IVariablesModel;

  readonly searcher: Panel;

  readonly variables: Panel;
}
