import { Panel } from "@phosphor/widgets";
import { VariableTableDescription } from './variableTableDescription';


export class VariableDescription extends Panel {
    
    readonly table: Panel;
    readonly descriptionBox: Panel; 

    constructor(){
        super();
        this.table = new VariableTableDescription();
        this.table.addClass('debugger-variable__table');
        this.addWidget(this.table);

        this.descriptionBox = new Panel();
        this.descriptionBox.addClass('debugger-variable__description');
        this.addWidget(this.descriptionBox);
    }
}