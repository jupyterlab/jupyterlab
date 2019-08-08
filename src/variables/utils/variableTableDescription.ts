import { h, VirtualDOM, VirtualElement } from "@phosphor/virtualdom";
import { SplitPanel } from '@phosphor/widgets';

const MOCK_DATA_ROW = {
    variables: [
        {
            name: 'test 1',
            value: 'function()',
            desription:'def test1(): return 0'
        },
        {
            name: 'test 2',
            value: 'function()',
            desription:'def test2(): return 0'
        }
    ]
}


export class VariableTableDescription extends SplitPanel {

    private _modelRow: any;

    constructor() {
        super();
        this._modelRow = MOCK_DATA_ROW;
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
                    variables: this._modelRow.variables,
                    nodes: [],
                    indent: 0
                })
            )
        );
        this.node.appendChild(VirtualDOM.realize(body));
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
            className: '',
            onmousedown: () => { },
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


}