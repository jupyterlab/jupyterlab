import { h, VirtualDOM, VirtualElement } from '@phosphor/virtualdom';
import { SplitPanel } from '@phosphor/widgets';
import { IVariablesModel } from '../model';

const ROW_CLASS = 'jp-DebuggerSidebarVariables-table-row';
const SELECTED_CLASS = '-selected';

export class VariableTableDescription extends SplitPanel {
  private _model: IVariablesModel;

  constructor(model: IVariablesModel) {
    super();
    this._model = model;
    this.renderHead();
    this.renderBody();
  }

  //render head of table
  protected renderHead() {
    const header = h.table(
      h.tr(
        h.td(
          {
            className: 'jp-DebuggerSidebarVariables-table-head',
            style: {
              width: '25%'
            }
          },
          'Name'
        ),
        h.td(
          {
            className: 'jp-DebuggerSidebarVariables-table-head',
            style: {
              width: '75%'
            }
          },
          'Value'
        )
      )
    );
    this.node.appendChild(VirtualDOM.realize(header));
  }

  // render body of table
  protected renderBody() {
    const body = h.div(
      h.table(
        this.renderVariableNodes({
          variables: this._model.variables,
          nodes: [],
          indent: 0
        })
      )
    );
    VirtualDOM.render(body, this.node);
  }

  protected renderVariableNodes(context: {
    readonly variables: Array<any>;
    readonly nodes: Array<any>;
    readonly indent: number;
  }) {
    let table: VirtualElement[] = [];
    for (const variable of context.variables) {
      table.push(this.renderRow(variable, context.indent + 1));
    }
    return table;
  }

  // render One row of table
  protected renderRow(variable: any, indent: number) {
    return h.tr(
      {
        className: `${ROW_CLASS}`,
        onmousedown: scope => this.setCurrentVariable(variable, scope),
        ondblclick: () => {}
      },
      h.td(
        {
          className: '',
          style: {
            paddingLeft: `${12 * indent}px`,
            width: `${25}%`
          }
        },
        h.span({ className: '' }),
        variable.name
      ),
      h.td(
        {
          className: '',
          style: {
            paddingLeft: `12px`,
            width: `${75}%`
          }
        },
        variable.value
      )
    );
  }

  protected clearClassName(rowNodes: Array<any>) {
    rowNodes.forEach(ele => {
      ele.className = `${ROW_CLASS}`;
    });
  }

  protected setCurrentVariable(variable: any, scope: any) {
    this._model.variable = variable;
    this.clearClassName(scope.path[2].childNodes);
    scope.path[1].className = `${ROW_CLASS}${SELECTED_CLASS}`;
  }
}
