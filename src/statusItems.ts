
import {
    Widget
} from '@phosphor/widgets';

export
abstract class StatusBarItem extends Widget {}

export
class ManagedStatusBarItem extends StatusBarItem {

    /*construct ManagedStatusBarItem*/
    constructor(options: ManagedStatusBarItem.IOptions = {}) {
        super();

        this._color = options.color;
        // this._commandId = options.commandId;
        this._iconClass = options.iconClass;
        // this._text = options.text;
        // this._tooltip = options.tooltip;
    }

    get color(): string {
        return this._color;
    }
    set color(newColor: string) {
        this._color = newColor;
        // TODO Add trigger for render update
    }

    get iconClass(): string {
        return this._iconClass;
    }
    set iconClass(newClass: string) {
        this._iconClass = newClass;
        // TODO Add trigger for render update
    }

    // TODO add get/set for each property being exposed

    private _color?: string;
    private _iconClass?: string;
    // private _text?: string;
    // private _tooltip?: string;

    // private _commandId?: string;
}

export
namespace ManagedStatusBarItem {

    export
    interface IOptions {
        color?: string;
        iconClass?: string;
        text?: string;
        tooltip?: string;
        commandId?: string;
    }
}

