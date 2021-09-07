import {  SplitPanel, Title, Widget } from '@lumino/widgets';

export class Renderer extends SplitPanel.Renderer  {
    /**
     * A selector which matches any title node in the accordion.
     */
    readonly titleClassName = 'jp-AccordionPanel-title';

    /**
     * Render the collapse indicator for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the collapse indicator.
     */
    createCollapseIcon(data: Title<Widget>): HTMLElement {
      return document.createElement('span');
    }

    /**
     * Render the element for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the section title.
     */
    createSectionTitle(data: Title<Widget>): HTMLElement {
      //@ts-ignore
      const header : Widget =  data.owner.header
      
      const handle =  document.createElement('h3');
      handle.setAttribute('role', 'button');
      handle.setAttribute('tabindex', '0');
      handle.id = this.createTitleKey(data);
      handle.className = this.titleClassName;
      if(header){
        console.log('adding', header.node);
        header.processMessage(Widget.Msg.BeforeAttach)
        handle.appendChild(header.node)
        header.processMessage(Widget.Msg.AfterAttach)
      }
      return handle;
    }

    /**
     * Create a unique render key for the title.
     *
     * @param data - The data to use for the title.
     *
     * @returns The unique render key for the title.
     *
     * #### Notes
     * This method caches the key against the section title the first time
     * the key is generated.
     */
    createTitleKey(data: Title<Widget>): string {
      let key = this._titleKeys.get(data);
      if (key === undefined) {
        key = `title-key-${this._titleID++}`;
        this._titleKeys.set(data, key);
      }
      return key;
    }

    private _titleID = 0;
    private _titleKeys = new WeakMap<Title<Widget>, string>();
  }
