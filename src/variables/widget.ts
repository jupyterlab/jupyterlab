import {Widget, Panel} from "@phosphor/widgets";

export class VariablesWidget extends Panel {
    
    readonly header: Panel;
    readonly label: Widget;
    readonly body: Panel;
    readonly model_header = {
        label:'Variables',
        class:'debugger-variables__header'
    };
    constructor(){
        super();
        
        // header
        this.header = new Panel();
        this.header.addClass(this.model_header.class);
        this.addWidget(this.header);

        this.label = new Widget();
        this.label.node.textContent = 'Variables';
        this.label.addClass('debugger-variables__header-label');
        this.header.addWidget(this.label);
        
        //body
        this.body = new Panel();
        this.body.addClass('debugger-variables__body')
        this.addWidget(this.body);
    }


}