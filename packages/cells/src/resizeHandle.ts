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
          '--jp-side-by-side-output-size',
          `1fr`
        );
        this._isActive = false;
        break;
      case 'mousedown':
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

        const width = targetRect.width - this._protectedWidth * 2;
        const position =
          (event as MouseEvent).clientX - targetRect.x - this._protectedWidth;

        const outputRatio = width / position - 1;

        document.documentElement.style.setProperty(
          '--jp-side-by-side-output-size',
          `${outputRatio}fr`
        );

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
