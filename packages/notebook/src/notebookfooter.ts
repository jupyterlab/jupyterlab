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
      case 'dblclick':
        this.onDblClick(event);
        break;
    }
  }

  onDblClick(event: any): void {
    NotebookActions.insertBelow(this.notebook);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('dblclick', this);
  }
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('dblclick', this);
    super.onBeforeDetach(msg);
  }
}
