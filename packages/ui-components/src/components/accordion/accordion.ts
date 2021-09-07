import { AccordionLayout, AccordionPanel as BaseAccordionPanel } from '@lumino/widgets';
import { Renderer } from './renderer';
import { ArrayExt } from '@lumino/algorithm';

export class AccordionPanel extends BaseAccordionPanel {
  constructor(options: BaseAccordionPanel.IOptions = {}) {
    super({ ...options, renderer: new Renderer() });
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.handleClick(event as MouseEvent);
        break;
      default:
          super.handleEvent(event);
    }

  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (target) {
      if( !['DIV', 'H2', 'H3'].includes(target.nodeName) ){
        return
      }
      
      const index = ArrayExt.findFirstIndex(this.titles, (title) => {
        return title.contains(target);
      });

      if (index >= 0) {
        event.preventDefault();
        event.stopPropagation();

        const widget = (this.layout as AccordionLayout).widgets[index];
        if (widget.isHidden) {
          target.classList.add('lm-mod-expanded');
          target.setAttribute('aria-expanded', 'true');
          widget.show();
        } else {
          target.classList.remove('lm-mod-expanded');
          target.setAttribute('aria-expanded', 'false');
          widget.hide();
        }
      }
    }
  }

}
