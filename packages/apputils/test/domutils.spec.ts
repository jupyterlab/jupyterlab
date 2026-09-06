// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOMUtils } from '@jupyterlab/apputils';

describe('@jupyterlab/apputils', () => {
  describe('DOMUtils', () => {
    describe('hasActiveEditableElement', () => {
      const testCases = [
        // editable elements
        ['.input', true],
        ['.textarea', true],
        ['.div-editable', true],
        // non-editable elements
        ['.input-readonly', false],
        ['.textarea-readonly', false],
        ['.div', false]
      ];

      const div = document.createElement('div');
      div.innerHTML = `
        <div class="light-host">
          <input class="input" />
          <input class="input-readonly" readonly />
          <textarea class="textarea"></textarea>
          <textarea class="textarea-readonly" readonly></textarea>
          <div class="div" tabindex="1"></div>
          <div class="div-editable" contenteditable="true" tabindex="1"></div>
        </div>
        <div class="shadow-host">
        </div>
      `;
      document.body.appendChild(div);

      const lightHost = div.querySelector('.light-host')!;
      const shadowHost = div.querySelector('.shadow-host')!;
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
      // mirror test cases from light DOM in the shadow DOM
      shadowRoot.innerHTML = lightHost.innerHTML;

      it.each(testCases)(
        'should work in light DOM: `%s` element should result in `%s`',
        (selector, expected) => {
          const element = lightHost.querySelector(
            selector as string
          ) as HTMLElement;
          element.focus();

          const result = DOMUtils.hasActiveEditableElement(div);
          expect(result).toBe(expected);
        }
      );

      it.each(testCases)(
        'should work in shadow DOM: `%s` element should result in `%s`',
        (selector, expected) => {
          const element = shadowRoot.querySelector(
            selector as string
          ) as HTMLElement;
          element.focus();

          const result = DOMUtils.hasActiveEditableElement(div);
          expect(result).toBe(expected);
        }
      );
    });
  });
});
