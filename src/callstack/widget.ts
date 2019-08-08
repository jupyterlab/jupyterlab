import { Widget, Panel } from "@phosphor/widgets";


export class CallstackWidget extends Panel {
    
    readonly header: Panel;
    readonly label: Widget;

    readonly model_header = {
        label:'CallStack',
        class:'debugger-variables__header'
    };

    constructor(){
        super();
        // header
        this.header = new Panel();
        this.header.addClass(this.model_header.class);
        this.addWidget(this.header);

        this.label = new Widget();
        this.label.node.textContent = this.model_header.label;
        this.label.addClass(this.model_header.class+'-label');
        this.header.addWidget(this.label);

    }


}