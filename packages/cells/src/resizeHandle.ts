import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

const RESIZE_HANDLE_CLASS = 'jp-CellResizeHandle';

const CELL_RESIZED_CLASS = 'jp-mod-resizedCell';

/**
 * A handle that allows to change input/output proportions in side-by-side mode.
 */
export class ResizeHandle extends Widget {
  private _isActive: boolean = false;
  private _isDragging: boolean = false;
  private _mouseOffset: number;
  private _protectedWidth = 10;

  constructor(protected targetNode: HTMLElement) {
    super();
    this.addClass(RESIZE_HANDLE_CLASS);
  }

  protected onAfterAttach(msg: Message) {
    super.onAfterAttach(msg);
    this.node.addEventListener('dblclick', this);
    this.node.addEventListener('mousedown', this);
  }

  protected onAfterDetach(msg: Message) {
    super.onAfterAttach(msg);
    this.node.removeEventListener('dblclick', this);
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'dblclick':
        this.targetNode.parentNode?.childNodes.forEach(node => {
          (node as HTMLElement).classList.remove(CELL_RESIZED_CLASS);
        });

        document.documentElement.style.setProperty(
          '--jp-side-by-side-resized-cell',
          ''
        );

        this._isActive = false;
        break;
      case 'mousedown':
        this._mouseOffset =
          (event as MouseEvent).clientX - this.node.getBoundingClientRect().x;
        this._isDragging = true;
        if (!this._isActive) {
          this.targetNode.parentNode?.childNodes.forEach(node => {
            (node as HTMLElement).classList.add(CELL_RESIZED_CLASS);
          });

          this._isActive = true;
        }
        window.addEventListener('mousemove', this);
        window.addEventListener('mouseup', this);
        break;
      case 'mousemove': {
        if (!this._isActive || !this._isDragging) {
          return;
        }
        const targetRect = this.targetNode.getBoundingClientRect();
        const inputWidth =
          (event as MouseEvent).clientX - targetRect.x - this._mouseOffset;

        const resized_ratio =
          1 -
          Math.min(
            Math.max(inputWidth, this._protectedWidth),
            targetRect.width - this._protectedWidth
          ) /
            (targetRect.width - this._protectedWidth);

        // Added friction to the dragging interaction
        if (Math.round(resized_ratio * 100) % 10 == 0) {
          document.documentElement.style.setProperty(
            '--jp-side-by-side-resized-cell',
            resized_ratio + 'fr'
          );
        }

        break;
      }
      case 'mouseup':
        this._isDragging = false;
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);
        break;
      default:
        break;
    }
  }
}
