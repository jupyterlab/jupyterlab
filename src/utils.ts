// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  hitTest
} from 'phosphor-domutil';


/**
 * Get the index of the node at a client position, or `-1`.
 */
export
function hitTestNodes(nodes: HTMLElement[] | NodeList, x: number, y: number): number {
  for (let i = 0, n = nodes.length; i < n; ++i) {
    if (hitTest(nodes[i] as HTMLElement, x, y)) {
      return i;
    }
  }
  return -1;
}


/**
 * Find the first element matching a class name.
 */
export
function findElement(parent: HTMLElement, className: string): HTMLElement {
  let elements = parent.getElementsByClassName(className);
  if (elements.length) {
    return elements[0] as HTMLElement;
  }
}

  /**
   * Vertically scroll an element into view if needed.
   *
   * @param area - The scroll area element.
   *
   * @param elem - The element of interest.
   *
   * #### Notes
   * This follows the "nearest" behavior of the native `scrollIntoView`
   * method, which is not supported by all browsers.
   * https://drafts.csswg.org/cssom-view/#element-scrolling-members
   *
   * If the element fully covers the visible area or is fully contained
   * within the visible area, no scrolling will take place. Otherwise,
   * the nearest edges of the area and element are aligned.
   *
   * #### License
   * This function is from the PhosphorJS project and has the following license.
   *
   * Copyright (c) 2014-2016, PhosphorJS Contributors
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * * Redistributions of source code must retain the above copyright notice, this
   *   list of conditions and the following disclaimer.
   *
   * * Redistributions in binary form must reproduce the above copyright notice,
   *   this list of conditions and the following disclaimer in the documentation
   *   and/or other materials provided with the distribution.
   *
   * * Neither the name of the copyright holder nor the names of its
   *   contributors may be used to endorse or promote products derived from
   *   this software without specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   * Copyright (c) 2014-2016, PhosphorJS Contributors
   *
   * See here for details:
   * https://github.com/phosphorjs/phosphor/blob/282a8ba6d542ce27ac583a3029f0dbd52d17228f/src/dom/query.ts#L95
   *
   * #### TODO
   * Switch this for importing phosphor's version when the monorepo is used.
   */
  export
  function scrollIntoViewIfNeeded(area: HTMLElement, elem: HTMLElement): void {
    let ar = area.getBoundingClientRect();
    let er = elem.getBoundingClientRect();
    if (er.top <= ar.top && er.bottom >= ar.bottom) {
      return;
    }
    if (er.top < ar.top && er.height <= ar.height) {
      area.scrollTop -= ar.top - er.top;
      return;
    }
    if (er.bottom > ar.bottom && er.height >= ar.height) {
      area.scrollTop -= ar.top - er.top;
      return;
    }
    if (er.top < ar.top && er.height > ar.height) {
      area.scrollTop -= ar.bottom - er.bottom;
      return;
    }
    if (er.bottom > ar.bottom && er.height < ar.height) {
      area.scrollTop -= ar.bottom - er.bottom;
      return;
    }
  }
