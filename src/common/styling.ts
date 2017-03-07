// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A namespace for node styling.
 */
export
namespace Styling {
  /**
   * Style a node and its child elements with the default tag names.
   *
   * @param node - The base node.
   *
   * @param className - The optional CSS class to add to styled nodes.
   */
  export
  function styleNode(node: HTMLElement, className=''): void {
    styleNodeByTag(node, 'select', className);
    styleNodeByTag(node, 'input', className);
    styleNodeByTag(node, 'button', className);
  }


  /**
   * Style a node and its elements that have a given tag name.
   *
   * @param node - The base node.
   *
   * @param tagName - The html tag name to style.
   *
   * @param className - The optional CSS class to add to styled nodes.
   */
  export
  function styleNodeByTag(node: HTMLElement, tagName: string, className=''): void {
    if (node.localName === tagName) {
      node.classList.add('jp-mod-styled');
    }
    if (node.localName === 'select') {
      wrapSelect(node as HTMLSelectElement);
    }
    let nodes = node.getElementsByTagName(tagName);
    for (let i = 0; i < nodes.length; i++) {
      let child = nodes[i];
      child.classList.add('jp-mod-styled');
      if (className) {
        child.classList.add(className);
      }
      if (tagName === 'select') {
        wrapSelect(child as HTMLSelectElement);
      }
    }
  }

  /**
   * Wrap a select node.
   */
  export
  function wrapSelect(node: HTMLSelectElement): HTMLElement {
    let wrapper = document.createElement('div');
    wrapper.classList.add('jp-select-wrapper');
    node.addEventListener('focus', Private.onFocus);
    node.addEventListener('blur', Private.onFocus);
    node.classList.add('jp-mod-styled');
    if (node.parentElement) {
      node.parentElement.replaceChild(wrapper, node);
    }
    wrapper.appendChild(node);
    return wrapper;
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
