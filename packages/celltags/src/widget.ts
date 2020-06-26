import { Widget } from '@lumino/widgets';

import { checkIcon } from '@jupyterlab/ui-components';

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

  /**
   * Create tag div with icon and attach to this.node.
   */
  buildTag() {
    const text = document.createElement('span');
    text.textContent = this.name;
    text.style.textOverflow = 'ellipsis';
    const tag = document.createElement('div');
    tag.className = 'tag-holder';
    tag.appendChild(text);
    const iconContainer = checkIcon.element({
      tag: 'span',
      elementPosition: 'center',
      height: '18px',
      width: '18px',
      marginLeft: '5px',
      marginRight: '-3px'
    });
    if (this.applied) {
      this.addClass('applied-tag');
    } else {
      this.addClass('unapplied-tag');
      iconContainer.style.display = 'none';
    }
    tag.appendChild(iconContainer);
    this.node.appendChild(tag);
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  onAfterAttach() {
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('mouseover', this);
    this.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  onBeforeDetach() {
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('mouseover', this);
    this.node.removeEventListener('mouseout', this);
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtClick();
        break;
      case 'mouseover':
        this._evtMouseOver();
        break;
      case 'mouseout':
        this._evtMouseOut();
        break;
      default:
        break;
    }
  }

  /**
   * Handle `update-request` messages. Check if applied to current active cell.
   */
  onUpdateRequest() {
    const applied = this.parent?.checkApplied(this.name);
    if (applied !== this.applied) {
      this.toggleApplied();
    }
  }

  /**
   * Update styling to reflect whether tag is applied to current active cell.
   */
  toggleApplied() {
    if (this.applied) {
      this.removeClass('applied-tag');
      (this.node.firstChild?.lastChild as HTMLSpanElement).style.display =
        'none';
      this.addClass('unapplied-tag');
    } else {
      this.removeClass('unapplied-tag');
      (this.node.firstChild?.lastChild as HTMLSpanElement).style.display =
        'inline-block';
      this.addClass('applied-tag');
    }
    this.applied = !this.applied;
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick() {
    if (this.applied) {
      this.parent?.removeTag(this.name);
    } else {
      this.parent?.addTag(this.name);
    }
    this.toggleApplied();
  }

  /**
   * Handle the `'mouseover'` event for the widget.
   */
  private _evtMouseOver() {
    (this.node as HTMLElement).classList.add('tag-hover');
  }

  /**
   * Handle the `'mouseout'` event for the widget.
   */
  private _evtMouseOut() {
    (this.node as HTMLElement).classList.remove('tag-hover');
  }

  public name: string;
  private applied: boolean;
  public parent: TagTool | null = null;
}
