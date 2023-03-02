import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { Notebook } from './widget';
import { NotebookActions } from './actions';

export class NotebookFooter extends Widget {
  constructor(protected notebook: Notebook) {
    super();
    this.node.className = 'jp-Notebook-footer';
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.onClick(event);
        break;
    }
  }

  onClick(event: any): void {
    NotebookActions.insertBelow(this.notebook);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
  }
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    super.onBeforeDetach(msg);
  }
}
