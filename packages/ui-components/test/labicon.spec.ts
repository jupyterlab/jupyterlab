// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LabIcon } from '@jupyterlab/ui-components';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const fooSvgstr = fs.readFileSync(path.join(__dirname, 'foo.svg'), {
  encoding: 'utf8'
});

const fooIcon = new LabIcon({
  name: 'test-ui-components:foo',
  svgstr: fooSvgstr
});

const styleGradientSvgstr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<style>.a{fill:url(#gradient0)}</style>
<defs><linearGradient id="gradient0"><stop offset="0" stop-color="#000"/></linearGradient></defs>
<rect class="a" width="10" height="10"/>
</svg>`;

const styleGradientIcon = new LabIcon({
  name: 'test-ui-components:style-gradient',
  svgstr: styleGradientSvgstr
});

describe('@jupyterlab/ui-components', () => {
  describe('svg import', () => {
    it('should hold a string with the raw contents of an svg', () => {
      expect(
        fooSvgstr.startsWith(`<svg width="24" height="24" viewBox="0 0 24 24"`)
      ).toBe(true);
    });
  });

  describe('LabIcon', () => {
    describe('attribute .svgstr', () => {
      it('should hold a string with the raw contents of an svg', () => {
        expect(
          fooIcon.svgstr.startsWith(
            `<svg width="24" height="24" viewBox="0 0 24 24"`
          )
        ).toBe(true);
      });
    });

    describe('id references', () => {
      function getIconIdData(svg: Element): {
        clipPathId: string;
        clipPathRef: string;
      } {
        const clipPathId = svg.querySelector('clipPath')?.getAttribute('id');
        const clipPathRef = svg.querySelector('g')?.getAttribute('clip-path');

        if (!clipPathId || !clipPathRef) {
          throw new Error('Test fixture svg is missing clipPath id references');
        }

        return { clipPathId, clipPathRef };
      }

      it('should create unique ids for each .element() render', () => {
        const firstSvg = fooIcon.element({ tag: null });
        const secondSvg = fooIcon.element({ tag: null });
        const first = getIconIdData(firstSvg);
        const second = getIconIdData(secondSvg);
        const firstStyleSvg = styleGradientIcon.element({ tag: null });
        const secondStyleSvg = styleGradientIcon.element({ tag: null });
        const firstGradientId = firstStyleSvg
          .querySelector('linearGradient')
          ?.getAttribute('id');
        const secondGradientId = secondStyleSvg
          .querySelector('linearGradient')
          ?.getAttribute('id');
        const firstStyleText =
          firstStyleSvg.querySelector('style')?.textContent;
        const secondStyleText =
          secondStyleSvg.querySelector('style')?.textContent;

        expect(first.clipPathId).not.toEqual(second.clipPathId);
        expect(first.clipPathRef).toEqual(`url(#${first.clipPathId})`);
        expect(second.clipPathRef).toEqual(`url(#${second.clipPathId})`);
        if (
          !firstGradientId ||
          !secondGradientId ||
          !firstStyleText ||
          !secondStyleText
        ) {
          throw new Error('Style-based gradient test fixture did not render');
        }

        expect(firstGradientId).not.toEqual(secondGradientId);
        expect(firstStyleText).toContain(`url(#${firstGradientId})`);
        expect(secondStyleText).toContain(`url(#${secondGradientId})`);
      });

      it('should create unique ids for each React render', () => {
        const firstMarkup = ReactDOMServer.renderToStaticMarkup(
          React.createElement(fooIcon.react, { tag: null })
        );
        const secondMarkup = ReactDOMServer.renderToStaticMarkup(
          React.createElement(fooIcon.react, { tag: null })
        );

        const firstSvg = new DOMParser()
          .parseFromString(firstMarkup, 'text/html')
          .querySelector('svg');
        const secondSvg = new DOMParser()
          .parseFromString(secondMarkup, 'text/html')
          .querySelector('svg');

        if (!firstSvg || !secondSvg) {
          throw new Error('React icon render did not produce svg markup');
        }

        const first = getIconIdData(firstSvg);
        const second = getIconIdData(secondSvg);

        expect(first.clipPathId).not.toEqual(second.clipPathId);
        expect(first.clipPathRef).toEqual(`url(#${first.clipPathId})`);
        expect(second.clipPathRef).toEqual(`url(#${second.clipPathId})`);
      });
    });
  });
});
