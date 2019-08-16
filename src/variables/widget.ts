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
  readonly model: IVariablesModel;

  readonly header: Panel;
  readonly label: Panel;
  readonly body: Panel;
  readonly variable: Panel;
  readonly searcher: Panel;

  readonly model_header = {
    label: 'Variables',
    class: 'jp-DebuggerSidebarVariables-header'
  };

  constructor() {
    super();

    this.model = IVariablesModel.create(MOCK_DATA_ROW.variables);

    // header
    this.header = new Panel();
    this.header.addClass(this.model_header.class);
    this.addWidget(this.header);

    this.label = new Panel();
    this.label.node.textContent = this.model_header.label;
    this.label.addClass(this.model_header.class + '-label');
    this.header.addWidget(this.label);

    //body
    this.variable = new VariableDescription(this.model);
    this.variable.addClass('jp-DebuggerSidebarVariables-body');
    this.addWidget(this.variable);
  }
}
