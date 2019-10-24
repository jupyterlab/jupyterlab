import { Widget } from '@phosphor/widgets';

import { TagTool } from './tool';

/**
 * A widget which hosts a cell tags area.
 */
export class AddWidget extends Widget {
  /**
   * Construct a new tag widget.
   */
  constructor() {
    super();
    this.addClass('tag');
    this.editing = false;
    this.buildTag();
  }

  buildTag() {
    let text = document.createElement('input');
    text.value = 'Add Tag';
    text.contentEditable = 'true';
    text.className = 'add-tag';
    text.style.width = '49px';
    let tag = document.createElement('div');
    tag.className = 'tag-holder';
    tag.appendChild(text);
    let img = document.createElement('span');
    img.className = 'add-icon';
    this.addClass('unapplied-tag');
    tag.appendChild(img);
    this.node.appendChild(tag);
  }

  onAfterAttach() {
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('mouseover', this);
    this.node.addEventListener('mouseout', this);
    this.node.addEventListener('keypress', this);
    this.node.addEventListener('focusout', this);
  }

  onBeforeDetach() {
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('mouseover', this);
    this.node.removeEventListener('mouseout', this);
    this.node.removeEventListener('keypress', this);
    this.node.removeEventListener('focusout', this);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtClick(event as MouseEvent);
        break;
      case 'mouseover':
        this._evtHover(event as MouseEvent);
        break;
      case 'mouseout':
        this._evtOffHover(event as MouseEvent);
        break;
      case 'keypress':
        this._evtKeyPress(event as KeyboardEvent);
        break;
      case 'focusout':
        this._evtBlur();
        break;
      default:
        break;
    }
  }

  private _evtClick(event: MouseEvent) {
    if (!this.editing) {
      this.editing = true;
      let target = event.target as HTMLInputElement;
      target.value = '';
      target.autofocus = true;
    }
  }

  private _evtHover(event: MouseEvent) {
    //(this.node as HTMLElement).classList.add("tag-hover");
  }

  private _evtOffHover(event: MouseEvent) {
    //(this.node as HTMLElement).classList.remove("tag-hover");
  }

  private _evtKeyPress(event: KeyboardEvent) {
    let inputElement = event.target as HTMLInputElement;
    let tmp = document.createElement('span');
    tmp.className = 'tag';
    tmp.innerHTML = inputElement.value;
    // set width to the pixel length of the text
    document.body.appendChild(tmp);
    inputElement.style.width = tmp.getBoundingClientRect().width + 8 + 'px';
    document.body.removeChild(tmp);
    // if they hit Enter, add the tag and reset state
    if (event.keyCode == 13) {
      let value = inputElement.value;
      (this.parent as TagTool).addTag(value);
      inputElement.blur();
      this._evtBlur();
    }
  }

  private _evtBlur() {
    if (this.editing) {
      this.editing = false;
      let target = event.target as HTMLInputElement;
      target.value = 'Add Tag';
      target.style.width = '49px';
    }
  }

  public parent: TagTool;
  private editing: boolean;
}
