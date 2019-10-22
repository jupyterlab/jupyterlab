// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget, SplitPanel, Panel } from '@phosphor/widgets';

import { Variables } from '../index';

import { Table } from './table';

import { Search } from './search';

import { Message } from '@phosphor/messaging';

export class Body extends Panel {
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerVariables-body');

    const searchParams = new Search(this.model);
    const splitPanel = new SplitPanel();
    const table = new Table(this.model);
    const description = new Description(this.model);

    splitPanel.orientation = 'vertical';
    splitPanel.node.style.height = `100%`;
    splitPanel.addWidget(table);
    splitPanel.addWidget(description);

    this.addWidget(searchParams);
    this.addWidget(splitPanel);
  }

  model: Variables.IModel;
}

class Description extends Widget {
  constructor(model: Variables.IModel) {
    super();
    this.addClass('jp-DebuggerVariables-description');
    this.model = model;

    this.model.currentChanged.connect(
      (model: Variables.IModel, variable: Variables.IVariable) => {
        this.currentVariable = variable;
        this.update();
      }
    );
  }

  protected onUpdateRequest(msg: Message) {
    if (!this.currentVariable) {
      return;
    }
    this.node.innerHTML = `<b>name: ${this.currentVariable.name}</b>
                                       <p>type: ${this.currentVariable.type} </p>
                                       Description:
                                       <p>${this.currentVariable.description}</p> `;
  }

  model: Variables.IModel;
  currentVariable: Variables.IVariable;
}
