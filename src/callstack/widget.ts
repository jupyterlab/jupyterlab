import { Widget, Panel } from '@phosphor/widgets';
import { ToolbarWidget } from '../utils';

export class CallstackWidget extends Panel {
  readonly header: Panel;
  readonly label: Widget;
  readonly toolbar: ToolbarWidget;

  readonly model_header = {
    label: 'CallStack',
    class: 'jp-DebuggerSidebarVariables-header'
  };

  constructor() {
    super();
    // header
    this.header = new Panel();
    this.header.addClass(this.model_header.class);
    this.addWidget(this.header);

    this.label = new Widget();
    this.label.node.textContent = this.model_header.label;
    this.label.addClass(this.model_header.class + '-label');
    this.header.addWidget(this.label);

    console.log('adding toolbar');
    //toolbar
    this.toolbar = new ToolbarWidget();
    this.toolbar.createSpanElement(`fa fa-active`, 'Continue');
    this.toolbar.createSpanElement(`fa fa-stop`, 'Stop');
    this.toolbar.createSpanElement(`fa fa-stepOver`, 'Step Over');
    this.toolbar.createSpanElement(`fa fa-stepIn`, 'Step In');
    this.toolbar.createSpanElement(`fa fa-stepOut`, 'Step Out');
    this.header.addWidget(this.toolbar);
  }
}
