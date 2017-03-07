// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Style a node and its child elements with the default tag names.
 */
export
function styleNode(node: HTMLElement): void {
  styleNodeByTag(node, 'select');
  styleNodeByTag(node, 'input');
  styleNodeByTag(node, 'button');
}


/**
 * Style a node and its elements that have a given tag name.
 */
export
function styleNodeByTag(node: HTMLElement, tagName: string): void {
  if (node.localName === tagName) {
    node.classList.add('jp-mod-styled');
  }
  let nodes = node.getElementsByTagName(tagName);
  for (let i = 0; i < nodes.length; i++) {
    let child = nodes[i];
    child.classList.add('jp-mod-styled');
    if (tagName === 'select') {
      let wrapper = document.createElement('div');
      wrapper.classList.add('jp-select-wrapper');
      child.addEventListener('focus', Private.onFocus);
      child.addEventListener('blur', Private.onFocus);
      node.replaceChild(wrapper, child);
      wrapper.appendChild(child);
    }
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Handle a focus event on a styled select.
   */
   export
   function onFocus(event: FocusEvent): void {
      let target = event.target as Element;
      let parent = target.parentElement;
      if (event.type === 'focus') {
        parent.classList.add('jp-mod-focused');
      } else {
        parent.classList.remove('jp-mod-focused');
     }
    }
}
