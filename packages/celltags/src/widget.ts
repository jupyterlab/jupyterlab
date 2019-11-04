import { Widget } from '@phosphor/widgets';

import { defaultIconRegistry } from '@jupyterlab/ui-components';

import { TagTool } from './tool';

/**
 * A widget which hosts a cell tags area.
 */
export class TagWidget extends Widget {
  /**
   * Construct a new tag widget.
   */
  constructor(name: string) {
    super();
    this.applied = true;
    this.name = name;
    this.addClass('tag');
    this.buildTag();
  }

  buildTag() {
    let text = document.createElement('span');
    text.textContent = this.name;
    text.style.textOverflow = 'ellipsis';
    let tag = document.createElement('div');
    tag.className = 'tag-holder';
    tag.appendChild(text);
    let img = document.createElement('span');
    defaultIconRegistry.icon({
      name: 'check',
      container: img,
      center: true,
      height: '18px',
      width: '18px',
      marginLeft: '5px',
      marginRight: '-3px'
    });
    if (this.applied) {
      this.addClass('applied-tag');
    } else {
      this.addClass('unapplied-tag');
      img.style.display = 'none';
    }
    tag.appendChild(img);
    this.node.appendChild(tag);
  }

  onAfterAttach() {
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('mouseover', this);
    this.node.addEventListener('mouseout', this);
  }

  onBeforeDetach() {
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('mouseover', this);
    this.node.removeEventListener('mouseout', this);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtClick();
        break;
      case 'mouseover':
        this._evtHover(event as MouseEvent);
        break;
      case 'mouseout':
        this._evtOffHover(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  onUpdateRequest() {
    let applied = this.parent.checkApplied(this.name);
    if (applied != this.applied) {
      this.toggleApplied();
    }
  }

  toggleApplied() {
    if (this.applied) {
      this.removeClass('applied-tag');
      (this.node.firstChild.lastChild as HTMLSpanElement).style.display =
        'none';
      this.addClass('unapplied-tag');
    } else {
      this.removeClass('unapplied-tag');
      (this.node.firstChild.lastChild as HTMLSpanElement).style.display =
        'inline-block';
      this.addClass('applied-tag');
    }
    this.applied = !this.applied;
  }

  private _evtClick() {
    if (this.applied) {
      this.parent.removeTag(this.name);
    } else {
      this.parent.addTag(this.name);
    }
    this.toggleApplied();
  }

  private _evtHover(event: MouseEvent) {
    (this.node as HTMLElement).classList.add('tag-hover');
  }

  private _evtOffHover(event: MouseEvent) {
    (this.node as HTMLElement).classList.remove('tag-hover');
  }

  public name: string;
  private applied: boolean;
  public parent: TagTool;
}
