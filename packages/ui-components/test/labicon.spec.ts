// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LabIcon } from '@jupyterlab/ui-components';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactDOMServer from 'react-dom/server';
import { act } from 'react-dom/test-utils';

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

const styleSelectorSvgstr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<style>#gradient0 stop:first-child{stop-color:#123}.a{fill:url(#gradient0)}</style>
<defs><linearGradient id="gradient0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
<rect class="a" width="10" height="10"/>
</svg>`;

const styleSelectorIcon = new LabIcon({
  name: 'test-ui-components:style-selector',
  svgstr: styleSelectorSvgstr
});

const rootIdSvgstr = `<svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<path fill="#fff" d="M0 0h10v10H0z"/>
</svg>`;

const rootIdIcon = new LabIcon({
  name: 'test-ui-components:root-id',
  svgstr: rootIdSvgstr
});

const animationSvgstr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<circle cx="4" cy="12" r="3"><animate id="fade0" attributeName="opacity" begin="0;fade1.end" dur="0.75s" values="1;0.2"/></circle>
<circle cx="20" cy="12" r="3"><animate id="fade1" attributeName="opacity" begin="fade0.begin+0.3s" dur="0.75s" values="1;0.2"/></circle>
</svg>`;

const animationIcon = new LabIcon({
  name: 'test-ui-components:animation',
  svgstr: animationSvgstr
});

const linkSvgstr = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10" aria-labelledby="title0">
<title id="title0">Link</title>
<defs><linearGradient id="base0"><stop offset="0" stop-color="#000"/></linearGradient><linearGradient id="chain0" xlink:href="#base0"/><rect id="shape0" width="10" height="10" fill="url(#chain0)"/></defs>
<use href="#shape0"/>
</svg>`;

const linkIcon = new LabIcon({
  name: 'test-ui-components:link',
  svgstr: linkSvgstr
});

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

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

function getStyleGradientData(svg: Element): {
  gradientId: string;
  styleText: string;
} {
  const gradientId = svg.querySelector('linearGradient')?.getAttribute('id');
  const styleText = svg.querySelector('style')?.textContent;

  if (!gradientId || !styleText) {
    throw new Error('Style-based gradient test fixture did not render');
  }

  return { gradientId, styleText };
}

describe('@jupyterlab/ui-components', () => {
  describe('svg import', () => {
    it('should hold a string with the raw contents of an svg', () => {
      expect(
        fooSvgstr.startsWith(`<svg width="24" height="24" viewBox="0 0 24 24"`)
      ).toBe(true);
    });
  });

  describe('LabIcon', () => {
    describe('#svgstr', () => {
      it('should hold a string with the raw contents of an svg', () => {
        expect(
          fooIcon.svgstr.startsWith(
            `<svg width="24" height="24" viewBox="0 0 24 24"`
          )
        ).toBe(true);
      });

      it('should keep unique ids when replacing rendered elements after svgstr updates', () => {
        const updateIcon = new LabIcon({
          name: 'test-ui-components:style-gradient-update',
          svgstr: styleGradientSvgstr
        });
        const firstContainer = document.createElement('div');
        const secondContainer = document.createElement('div');
        document.body.appendChild(firstContainer);
        document.body.appendChild(secondContainer);

        try {
          updateIcon.element({ container: firstContainer });
          updateIcon.element({ container: secondContainer });

          updateIcon.svgstr = styleGradientSvgstr;

          const firstUpdatedSvg = firstContainer.querySelector('svg');
          const secondUpdatedSvg = secondContainer.querySelector('svg');
          if (!firstUpdatedSvg || !secondUpdatedSvg) {
            throw new Error('Updated icon render did not produce svg markup');
          }

          const firstStyle = getStyleGradientData(firstUpdatedSvg);
          const secondStyle = getStyleGradientData(secondUpdatedSvg);

          expect(firstStyle.gradientId).not.toEqual(secondStyle.gradientId);
          expect(firstUpdatedSvg.getAttribute('style')).toBe(
            `--jp-icon-ref-gradient0:url(#${firstStyle.gradientId})`
          );
          expect(secondUpdatedSvg.getAttribute('style')).toBe(
            `--jp-icon-ref-gradient0:url(#${secondStyle.gradientId})`
          );
        } finally {
          firstContainer.remove();
          secondContainer.remove();
        }
      });
    });

    describe('#element()', () => {
      it('should create unique ids for each .element() render', () => {
        const firstSvg = fooIcon.element({ tag: null });
        const secondSvg = fooIcon.element({ tag: null });
        const first = getIconIdData(firstSvg);
        const second = getIconIdData(secondSvg);
        const firstStyleSvg = styleGradientIcon.element({ tag: null });
        const secondStyleSvg = styleGradientIcon.element({ tag: null });
        const firstStyle = getStyleGradientData(firstStyleSvg);
        const secondStyle = getStyleGradientData(secondStyleSvg);

        expect(first.clipPathId).not.toEqual(second.clipPathId);
        expect(first.clipPathRef).toEqual(`url(#${first.clipPathId})`);
        expect(second.clipPathRef).toEqual(`url(#${second.clipPathId})`);
        expect(firstStyle.gradientId).not.toEqual(secondStyle.gradientId);
        expect(firstStyleSvg.getAttribute('style')).toBe(
          `--jp-icon-ref-gradient0:url(#${firstStyle.gradientId})`
        );
        expect(secondStyleSvg.getAttribute('style')).toBe(
          `--jp-icon-ref-gradient0:url(#${secondStyle.gradientId})`
        );
      });

      it('should rewrite inline style ID selectors when ids are uniquified', () => {
        const firstSvg = styleSelectorIcon.element({ tag: null });
        const secondSvg = styleSelectorIcon.element({ tag: null });
        const first = getStyleGradientData(firstSvg);
        const second = getStyleGradientData(secondSvg);

        expect(first.styleText).toContain(
          `#${first.gradientId} stop:first-child`
        );
        expect(firstSvg.getAttribute('style')).toBe(
          `--jp-icon-ref-gradient0:url(#${first.gradientId})`
        );
        expect(first.styleText).toContain('stop-color:#123');
        expect(first.styleText).not.toContain('#gradient0 stop:first-child');

        expect(second.styleText).toContain(
          `#${second.gradientId} stop:first-child`
        );
        expect(secondSvg.getAttribute('style')).toBe(
          `--jp-icon-ref-gradient0:url(#${second.gradientId})`
        );
        expect(second.styleText).toContain('stop-color:#123');
        expect(second.styleText).not.toContain('#gradient0 stop:first-child');
      });

      it('should rewrite an inline style ID selector that follows another rule', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-selector-minified',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<style>.a{fill:url(#gradient0)}#gradient0 stop:first-child{stop-color:#123}</style>
<defs><linearGradient id="gradient0"><stop offset="0" stop-color="#000"/></linearGradient></defs>
<rect class="a" width="10" height="10"/>
</svg>`
        });

        const { gradientId, styleText } = getStyleGradientData(
          icon.element({ tag: null })
        );

        expect(styleText).toBe(
          `.a{fill:var(--jp-icon-ref-gradient0)}#${gradientId} stop:first-child{stop-color:#123}`
        );
      });

      it('should keep the style rules the same in every .element() copy', () => {
        const first = getStyleGradientData(
          styleGradientIcon.element({ tag: null })
        );
        const second = getStyleGradientData(
          styleGradientIcon.element({ tag: null })
        );

        expect([first.styleText, second.styleText]).toEqual([
          '.a{fill:var(--jp-icon-ref-gradient0)}',
          '.a{fill:var(--jp-icon-ref-gradient0)}'
        ]);
      });

      it('should keep unreferenced ids in .element() renders', () => {
        const svg = rootIdIcon.element({ tag: null });

        expect(svg.getAttribute('id')).toBe('logo');
      });

      it('should keep ids used by animation timing', () => {
        const svg = animationIcon.element({ tag: null });
        const ids = Array.from(svg.querySelectorAll('animate')).map(animate =>
          animate.getAttribute('id')
        );

        expect(ids).toEqual(['fade0', 'fade1']);
      });

      it('should not give a renamed id the value of another id of the svg', () => {
        const used = fooIcon
          .element({ tag: null })
          .querySelector('clipPath')!
          .getAttribute('id')!
          .slice('clip0-'.length);
        const next = (parseInt(used, 36) + 1).toString(36);
        // Adobe XD names a shape after its filter, as "Rectangle_1-2"
        const icon = new LabIcon({
          name: 'test-ui-components:taken-suffix',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<defs><filter id="shadow"><feGaussianBlur stdDeviation="1"/></filter></defs>
<g filter="url(#shadow)"><rect id="shadow-${next}" width="10" height="10"/></g>
</svg>`
        });

        const svg = icon.element({ tag: null });

        expect(svg.querySelector('filter')!.getAttribute('id')).not.toBe(
          `shadow-${next}`
        );
      });

      it('should point the href of each copy at its own element', () => {
        const copies = [
          linkIcon.element({ tag: null }),
          linkIcon.element({ tag: null })
        ];
        const shapes = copies.map(svg =>
          svg.querySelector('rect')!.getAttribute('id')
        );

        expect(shapes[0]).not.toEqual(shapes[1]);
        expect(
          copies.map(svg => svg.querySelector('use')!.getAttribute('href'))
        ).toEqual(shapes.map(id => `#${id}`));
      });

      it('should keep the namespace of a renamed xlink:href', () => {
        const copies = [
          linkIcon.element({ tag: null }),
          linkIcon.element({ tag: null })
        ];
        const bases = copies.map(svg =>
          svg.querySelector('linearGradient')!.getAttribute('id')
        );

        expect(bases[0]).not.toEqual(bases[1]);
        expect(
          copies.map(svg =>
            svg
              .querySelectorAll('linearGradient')[1]
              .getAttributeNS(XLINK_NAMESPACE, 'href')
          )
        ).toEqual(bases.map(id => `#${id}`));
      });

      it('should point the aria-labelledby of each copy at its own title', () => {
        const copies = [
          linkIcon.element({ tag: null }),
          linkIcon.element({ tag: null })
        ];
        const titles = copies.map(svg =>
          svg.querySelector('title')!.getAttribute('id')
        );

        expect(titles[0]).not.toEqual(titles[1]);
        expect(copies.map(svg => svg.getAttribute('aria-labelledby'))).toEqual(
          titles
        );
      });

      it('should keep a colour in a style declaration that spells a renamed id', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:colour-like-id',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">
<style>.c { fill: #abc }</style>
<defs><linearGradient id="abc"/></defs>
<rect fill="url(#abc)" width="10" height="10"/><rect class="c" x="10" width="10" height="10"/>
</svg>`
        });

        const { gradientId, styleText } = getStyleGradientData(
          icon.element({ tag: null })
        );

        expect(gradientId).not.toBe('abc');
        expect(styleText).toBe('.c { fill: #abc }');
      });
    });

    describe('#react', () => {
      it('should set the custom properties of each React copy on its svg', () => {
        const markup = ReactDOMServer.renderToStaticMarkup(
          React.createElement(styleGradientIcon.react, { tag: null })
        );
        const svg = new DOMParser()
          .parseFromString(markup, 'text/html')
          .querySelector('svg')!;
        const { gradientId } = getStyleGradientData(svg);

        expect(svg.getAttribute('style')).toBe(
          `--jp-icon-ref-gradient0:url(#${gradientId})`
        );
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

      it('should keep unreferenced ids in React renders', () => {
        const markup = ReactDOMServer.renderToStaticMarkup(
          React.createElement(rootIdIcon.react, { tag: null })
        );
        const svg = new DOMParser()
          .parseFromString(markup, 'text/html')
          .querySelector('svg');

        expect(svg?.getAttribute('id')).toBe('logo');
      });

      it('should show an svg replaced before the component subscribed', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:replaced-early',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg"><rect id="old"/></svg>'
        });
        // a layout effect runs after the render and before the icon's effect
        const Replace = () => {
          React.useLayoutEffect(() => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg"><rect id="new"/></svg>';
          }, []);
          return null;
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(
                React.Fragment,
                null,
                React.createElement(icon.react, { tag: null }),
                React.createElement(Replace)
              )
            );
          });

          expect(host.querySelector('rect')?.getAttribute('id')).toBe('new');
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should keep the ids of a copy when it renders again', async () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(fooIcon.react, { tag: null, className: 'a' })
            );
          });
          const id = host.querySelector('clipPath')!.getAttribute('id');
          await act(async () => {
            root.render(
              React.createElement(fooIcon.react, { tag: null, className: 'b' })
            );
          });

          expect(host.querySelector('svg')?.getAttribute('class')).toBe('b');
          expect(host.querySelector('clipPath')?.getAttribute('id')).toBe(id);
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should not set data-icon-id on a copy with its own ids', async () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(fooIcon.react, { tag: null }));
          });

          expect(host.querySelector('svg')?.hasAttribute('data-icon-id')).toBe(
            false
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });
    });
  });
});
