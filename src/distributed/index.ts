import {
  Widget, ResizeMessage
} from 'phosphor/lib/ui/widget';

import {
  Message
} from 'phosphor/lib/core/messaging';

// import Bokeh = require('bokehjs')

/**
 * A Distributed UI element (generally a Bokeh plot) which wraps a phosphor widget.
 */
export
class DistributedUIElement extends Widget {
  /**
   * Create a new DistributedUIElement.
   */
  constructor(script: any) {
    super();

    let tag = document.createElement('script')
    tag.src = script.src
    tag.id = script.bokeh_id
    tag.setAttribute('data-bokeh-model-id', script['data-bokeh-model-id'])
    tag.setAttribute('data-bokeh-doc-id', script['data-bokeh-doc-id'])

    // wrap bokeh elements in div to apply css selector
    let div = document.createElement('div')
    div.classList.add('bk-root')
    div.appendChild(tag)

    // store bokeh model id as private attr for access in onResize eventing
    this._bokeh_id = script.bokeh_id

    this.id = script.id
    this.title.label = script.text
    this.title.closable = true
    this.node.appendChild(div)
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: ResizeMessage) {
    let width: Number = msg.width;
    let height: Number = msg.height;
    // Bokeh.index[this._bokeh_id].model.document.resize(width=width, height=height)

  }

  private _bokeh_id: String = "";

}
