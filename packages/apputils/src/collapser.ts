import {
  Widget
} from '@phosphor/widgets';



import {
  Signal, ISignal
} from '@phosphor/signaling';


import {
  Message
} from '@phosphor/messaging';


const COLLAPSER_CLASS = 'jp-Collapser';

const COLLAPSED_CLASS = 'jp-mod-collapsed';

export
class Collapser extends Widget {

  constructor() {
    super();
    this.addClass(COLLAPSER_CLASS);
  }


  get collapsedChanged(): ISignal<this, boolean> {
    return this._collapsedChanged;
  }


  get collapsed(): boolean {
    return this._collapsed;
  }


  set collapsed(newValue: boolean) {
      this._collapsed = newValue;
      if (newValue) {
        this.addClass(COLLAPSED_CLASS);
      } else {
        this.removeClass(COLLAPSED_CLASS);
      }
      this._collapsedChanged.emit(newValue);
  }


  toggleCollapsed(): boolean {
      this.collapsed = !this.collapsed;
      return this.collapsed;
  }


  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this.toggleCollapsed();
      break;
    default:
      break;
    }
  }

  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
  }


  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }


  get isDisposed(): boolean {
    return this._isDisposed;
  }


  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  private _collapsed = false;
  private _collapsedChanged = new Signal<this, boolean>(this);
  private _isDisposed = false;
}

