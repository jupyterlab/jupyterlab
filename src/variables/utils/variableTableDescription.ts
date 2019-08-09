import { h, VirtualDOM, VirtualElement } from "@phosphor/virtualdom";
import { SplitPanel } from '@phosphor/widgets';



const ROW_CLASS = 'debugger-variables_table-row';
const SELECTED_CLASS = '-selected';


export class VariableTableDescription extends SplitPanel {

    private _model: any;

    constructor(model: any) {
        super();
        this._model = model;
        this.renderHead();
        this.renderBody();
    }

    protected renderHead() {
        const header = h.table(
            h.tr(
                h.td(
                    {
                        className: 'debugger-variables_table-head',
                        style: {
                            width: '25%'
                        }
                    }, 'Name'),
                h.td({
                    className: 'debugger-variables_table-head',
                    style: {
                        width: '75%'
                    }
                }, 'Value')
            )
        )
        this.node.appendChild(VirtualDOM.realize(header));
    }

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
        // this.node.appendChild(VirtualDOM.realize(body));
        VirtualDOM.render(body,this.node);
    }


    protected renderVariableNodes(context: {
        readonly variables: Array<any>;
        readonly nodes: Array<any>;
        readonly indent: number;
    }) {
        let table: VirtualElement[] = [];
        for (const variable of context.variables) {
            table.push(this.renderRow(variable, context.indent + 1))
        }
        return table;
    }



    protected renderRow(variable: any, indent: number) {
        return h.tr({
            className: this.createVariableNodeClass(variable)  ,
            onmousedown: (scope) => this.setCurrentVariable(variable, scope),
            ondblclick: () => { }
        },
            h.td({
                className: '',
                style: {
                    paddingLeft: `${12 * indent}px`,
                    width: `${25}%`
                }
            },
                h.span({ className: '' }),
                variable.name
            ),
            h.td({
                className: '',
                style: {
                    paddingLeft: `12px`,
                    width: `${75}%`
                }
            }, variable.value)
        );
    }


    protected createVariableNodeClass(variable: any): string {
        return (variable === this._model.variable)? `${ROW_CLASS}${SELECTED_CLASS}`:ROW_CLASS;
    }

    protected clearClassName(rowNodes: Array<any>) {
        rowNodes.forEach( ele => {
            ele.className = `${ROW_CLASS}`;
        });
    };

    protected setCurrentVariable(variable: any, scope:any) {
        this._model.variable = variable;
        this.clearClassName(scope.path[2].childNodes);
        scope.path[1].className = `${ROW_CLASS}${SELECTED_CLASS}`;
    }


}