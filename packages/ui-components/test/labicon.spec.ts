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
        const svgstr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<defs><linearGradient id="gradient0"><stop offset="0" stop-color="#000"/></linearGradient></defs>
<rect fill="url(#gradient0)" width="10" height="10"/>
</svg>`;
        const updateIcon = new LabIcon({
          name: 'test-ui-components:gradient-update',
          svgstr
        });
        const firstContainer = document.createElement('div');
        const secondContainer = document.createElement('div');
        document.body.appendChild(firstContainer);
        document.body.appendChild(secondContainer);

        try {
          updateIcon.element({ container: firstContainer });
          updateIcon.element({ container: secondContainer });

          updateIcon.svgstr = svgstr;

          const copies = [firstContainer, secondContainer].map(container => {
            const svg = container.querySelector('svg');
            if (!svg) {
              throw new Error('Updated icon render did not produce svg markup');
            }
            return svg;
          });
          const ids = copies.map(svg =>
            svg.querySelector('linearGradient')!.getAttribute('id')
          );

          expect(ids[0]).not.toEqual(ids[1]);
          expect(
            copies.map(svg => svg.querySelector('rect')!.getAttribute('fill'))
          ).toEqual(ids.map(id => `url(#${id})`));
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

        expect(first.clipPathId).not.toEqual(second.clipPathId);
        expect(first.clipPathRef).toEqual(`url(#${first.clipPathId})`);
        expect(second.clipPathRef).toEqual(`url(#${second.clipPathId})`);
      });

      it('should keep unreferenced ids in .element() renders', () => {
        const svg = rootIdIcon.element({ tag: null });

        expect(svg.getAttribute('id')).toBe('logo');
      });

      it('should rename an id that only animation timing refers to', () => {
        const svg = animationIcon.element({ tag: null });
        const ids = Array.from(svg.querySelectorAll('animate'), animate =>
          animate.getAttribute('id')
        );

        expect(ids[0]).toMatch(/^fade0_[0-9a-z]+$/);
        expect(svg.querySelector('animate')!.getAttribute('begin')).toBe(
          `0;${ids[1]}.end`
        );
      });

      it('should not give a renamed id the value of another id of the svg', () => {
        const used = fooIcon
          .element({ tag: null })
          .querySelector('clipPath')!
          .getAttribute('id')!
          .slice('clip0_'.length);
        const next = (parseInt(used, 36) + 1).toString(36);
        // Illustrator names ids this way, as in "Layer_1"
        const icon = new LabIcon({
          name: 'test-ui-components:taken-suffix',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<defs><filter id="shadow"><feGaussianBlur stdDeviation="1"/></filter></defs>
<g filter="url(#shadow)"><rect id="shadow_${next}" width="10" height="10"/></g>
</svg>`
        });

        const svg = icon.element({ tag: null });

        expect(svg.querySelector('filter')!.getAttribute('id')).not.toBe(
          `shadow_${next}`
        );
      });

      it('should not repeat an id that another copy of this module gave', () => {
        // an extension that imports LabIcon through a deep path bundles its
        // own copy of this module
        const load = (): typeof LabIcon => {
          let copy: typeof LabIcon | undefined;
          jest.isolateModules(() => {
            copy =
              require('@jupyterlab/ui-components/lib/icon/labicon').LabIcon;
          });
          return copy!;
        };
        const ids = [load(), load()].map(Copy =>
          new Copy({
            name: 'test-ui-components:module-copy',
            svgstr: fooSvgstr
          })
            .element({ tag: null })
            .querySelector('clipPath')!
            .getAttribute('id')
        );

        expect(ids[0]).not.toEqual(ids[1]);
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

      it('should rename an id that an XLink href with another prefix refers to', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:xlink-prefix',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
<defs><linearGradient id="base0"><stop offset="0" stop-color="#000"/></linearGradient><linearGradient id="chain0" x:href="#base0"/></defs>
<rect fill="url(#chain0)" width="10" height="10"/>
</svg>`
        });

        const svg = icon.element({ tag: null });
        const [base, chain] = Array.from(
          svg.querySelectorAll('linearGradient')
        );

        expect(base.getAttribute('id')).not.toBe('base0');
        expect(chain.getAttributeNS(XLINK_NAMESPACE, 'href')).toBe(
          `#${base.getAttribute('id')}`
        );
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

      it.each(['aria-describedby', 'aria-labelledby'])(
        'should point %s of each copy at its own element',
        attribute => {
          const icon = new LabIcon({
            name: `test-ui-components:id-list-${attribute}`,
            svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<rect id="shape0" width="10" height="10"/><g ${attribute}="shape0 other"/>
</svg>`
          });

          const svg = icon.element({ tag: null });
          const id = svg.querySelector('rect')!.getAttribute('id');

          expect(id).toMatch(/^shape0_[0-9a-z]+$/);
          expect(svg.querySelector('g')!.getAttribute(attribute)).toBe(
            `${id} other`
          );
        }
      );

      it('should split a list of ids at any space', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:id-list-tab',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<rect id="shape0" width="10" height="10"/><g aria-labelledby="other&#9;shape0"/>
</svg>`
        });

        const svg = icon.element({ tag: null });

        expect(svg.querySelector('g')!.getAttribute('aria-labelledby')).toMatch(
          /^other\tshape0_[0-9a-z]+$/
        );
      });

      it('should rename an id that the style attribute of the svg names', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:root-style-url',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="fill:url(#gradient0)"><linearGradient id="gradient0"/></svg>'
        });

        const svg = icon.element({ tag: null });
        const id = svg.querySelector('linearGradient')!.getAttribute('id');

        expect(id).toMatch(/^gradient0_[0-9a-z]+$/);
        expect(svg.getAttribute('style')).toBe(`fill:url(#${id})`);
      });

      it('should rename an id that an upper case URL() refers to', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:upper-case-url',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<defs><linearGradient id="gradient0"/></defs>
<rect fill="URL(#gradient0)" width="10" height="10"/>
</svg>`
        });

        const svg = icon.element({ tag: null });
        const id = svg.querySelector('linearGradient')!.getAttribute('id');

        expect(id).not.toBe('gradient0');
        expect(svg.querySelector('rect')!.getAttribute('fill')).toBe(
          `URL(#${id})`
        );
      });

      it('should rename an id that a url() names with an escape', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:escaped-url',
          svgstr: String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<defs><linearGradient id="a.b"/></defs>
<rect fill="url(#a\.b)" width="10" height="10"/>
</svg>`
        });

        const svg = icon.element({ tag: null });
        const id = svg.querySelector('linearGradient')!.getAttribute('id')!;

        expect(id).toMatch(/^a\.b_[0-9a-z]+$/);
        expect(svg.querySelector('rect')!.getAttribute('fill')).toBe(
          String.raw`url(#a\.b${id.slice('a.b'.length)})`
        );
      });

      it('should rename an id that an href with spaces names', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:href-spaces',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<defs><rect id="shape0" width="10" height="10"/></defs>
<use href=" #shape0 "/>
</svg>`
        });

        const svg = icon.element({ tag: null });
        const id = svg.querySelector('rect')!.getAttribute('id');

        expect(id).toMatch(/^shape0_[0-9a-z]+$/);
        expect(svg.querySelector('use')!.getAttribute('href')).toBe(` #${id} `);
      });

      it('should point the animation timing of each copy at its own element', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:timing',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">
<circle id="dot0" cx="5" cy="5" r="2"><animate attributeName="r" to="5" dur="1s" begin="0s;dot0.click"/></circle>
<use href="#dot0" x="10"/>
</svg>`
        });

        const svg = icon.element({ tag: null });
        const id = svg.querySelector('circle')!.getAttribute('id');

        expect(id).not.toBe('dot0');
        expect(svg.querySelector('animate')!.getAttribute('begin')).toBe(
          `0s;${id}.click`
        );
      });

      it('should keep the escape of an id in animation timing', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:escaped-timing',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">
<circle id="dot-0" cx="5" cy="5" r="2"><animate attributeName="r" to="5" dur="1s" begin="dot\\-0.click"/></circle>
<use href="#dot-0" x="10"/>
</svg>`
        });

        const svg = icon.element({ tag: null });
        const id = svg.querySelector('circle')!.getAttribute('id')!;

        expect(id).not.toBe('dot-0');
        expect(svg.querySelector('animate')!.getAttribute('begin')).toBe(
          `dot\\-0${id.slice('dot-0'.length)}.click`
        );
      });

      it('should keep an offset of animation timing that starts with the digit of an id', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:timing-offset',
          svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
<rect id="0" width="10" height="10"><animate attributeName="x" to="5" dur="1s" begin="0.5s"/></rect>
<use href="#0"/>
</svg>`
        });

        const svg = icon.element({ tag: null });

        expect(svg.querySelector('animate')!.getAttribute('begin')).toBe(
          '0.5s'
        );
      });

      it('should keep the text of a style element when the browser gives no style sheet', () => {
        // jsdom parses no style sheet in a document without a window
        const { styleText } = getStyleGradientData(
          styleGradientIcon.element({ tag: null })
        );

        expect(styleText).toBe('.a{fill:url(#gradient0)}');
      });

      it('should keep an id that only a style element names when the browser gives no style sheet', () => {
        const { gradientId } = getStyleGradientData(
          styleGradientIcon.element({ tag: null })
        );

        expect(gradientId).toBe('gradient0');
      });

      it('should render an svg with a percent sign that starts no escape', () => {
        const icon = new LabIcon({
          name: 'test:percent',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg"><stop offset="50%"/></svg>'
        });
        let offset: string | null | undefined;

        expect(() => {
          offset = icon
            .element({ tag: null })
            .querySelector('stop')
            ?.getAttribute('offset');
        }).not.toThrow();
        expect(offset).toBe('50%');
      });

      it('should decode the escapes of a data URL with a percent sign that starts no escape', () => {
        const icon = new LabIcon({
          name: 'test:percent-data-url',
          svgstr:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cstop offset=%2250%%22/%3E%3C/svg%3E'
        });

        const stop = icon.element({ tag: null }).querySelector('stop');

        expect(stop?.getAttribute('offset')).toBe('50%');
      });

      it('should decode an escape of a character of several bytes', () => {
        const icon = new LabIcon({
          name: 'test:multibyte-escape',
          svgstr:
            'data:image/svg+xml,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg"><title>café 50%</title></svg>'
            )
        });

        const svg = icon.element({ tag: null });

        expect(svg.querySelector('title')?.textContent).toBe('café 50%');
      });

      it('should keep an escape that is not UTF-8', () => {
        const icon = new LabIcon({
          name: 'test:latin-1-escape',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.com/caf%E9"/></svg>'
        });

        const link = icon.element({ tag: null }).querySelector('a');

        expect(link?.getAttribute('href')).toBe('https://example.com/caf%E9');
      });
    });

    describe('#react', () => {
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

      it('should keep the style of the root of an svg without references', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:react-root-style',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null }));
          });

          expect(host.querySelector('svg')?.getAttribute('style')).toBe(
            'opacity:0.5'
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give a copy the style of the root before the layout effects of its parent run', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:root-style-layout',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity: 0.5 !important"><rect/></svg>'
        });
        let style: string | null | undefined;
        // layout effects run after the refs of their children are attached,
        // and before passive effects
        const Parent = () => {
          const ref = React.useRef<SVGElement>(null);
          React.useLayoutEffect(() => {
            style = ref.current?.getAttribute('style');
          }, []);
          return React.createElement(icon.react, { tag: null, ref });
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(Parent));
          });

          expect(style).toBe('opacity: 0.5 !important');
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should keep the priority of a declaration of the root after a render that changes its custom properties', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:root-style-priority',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="--test-a: 1; opacity: 0.5 !important"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null }));
          });
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="--test-a: 2; opacity: 0.25 !important"><rect/></svg>';
          });

          expect(host.querySelector('svg')?.getAttribute('style')).toBe(
            '--test-a: 2; opacity: 0.25 !important'
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give a copy rendered on the server the custom properties of the root', () => {
        const icon = new LabIcon({
          name: 'test-ui-components:server-root-style',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="--test-a: 1; opacity: 0.5"><rect/></svg>'
        });

        const markup = ReactDOMServer.renderToStaticMarkup(
          React.createElement(icon.react, { tag: null })
        );
        const svg = new DOMParser()
          .parseFromString(markup, 'text/html')
          .querySelector('svg');

        expect(svg?.getAttribute('style')).toBe('--test-a:1');
      });

      it('should keep a style that code sets on the svg of a copy when the copy renders again', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-set-by-code',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="--test-a: 1"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(icon.react, { tag: null, className: 'a' })
            );
          });
          host.querySelector('svg')!.style.setProperty('opacity', '0.5');
          await act(async () => {
            root.render(
              React.createElement(icon.react, { tag: null, className: 'b' })
            );
          });

          expect(
            host.querySelector('svg')?.style.getPropertyValue('opacity')
          ).toBe('0.5');
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should keep a style that code sets on the svg of a copy when the svg is replaced', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-set-by-code-replaced',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const ref = React.createRef<SVGElement>();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null, ref }));
          });
          ref.current?.style.setProperty('cursor', 'pointer');
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.25"><rect/></svg>';
          });

          expect(ref.current?.style.getPropertyValue('cursor')).toBe('pointer');
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should join a style that code sets to the style of a replaced svg without an empty declaration', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-set-by-code-joined',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const ref = React.createRef<SVGElement>();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null, ref }));
          });
          ref.current?.style.setProperty('cursor', 'pointer');
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.25"><rect/></svg>';
          });

          expect(ref.current?.getAttribute('style')).not.toContain(';;');
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give a copy the value of a replaced svg for a property that code set as important', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:important-style-replaced',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const ref = React.createRef<SVGElement>();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null, ref }));
          });
          ref.current?.style.setProperty('cursor', 'pointer', 'important');
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5; cursor: move"><rect/></svg>';
          });

          // jsdom lets a later declaration win over an important one, so
          // check that the attribute holds only the declarations of the svg
          expect(ref.current?.getAttribute('style')).toBe(
            'opacity:0.5; cursor: move'
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give a copy each custom property of a replaced svg once', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:custom-property-replaced',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="--test-a: 1"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null }));
          });
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="--test-b: 2"><rect/></svg>';
          });

          expect(host.querySelector('svg')?.getAttribute('style')).toBe(
            '--test-b: 2'
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should keep a style that a callback ref sets on the svg of a copy', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-set-by-ref',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.25"><rect/></svg>'
        });
        const ref = (node: SVGElement | null) => {
          node?.style.setProperty('opacity', '0.5');
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null, ref }));
          });

          expect(
            host.querySelector('svg')?.style.getPropertyValue('opacity')
          ).toBe('0.5');
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

      it('should give the svg of a copy to a ref object', async () => {
        const ref = React.createRef<SVGElement>();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(fooIcon.react, { tag: null, ref }));
          });

          expect(ref.current).toBe(host.querySelector('svg'));
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should not call a callback ref again when the svg is replaced', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:ref-replaced',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const nodes: (SVGElement | null)[] = [];
        const ref = (node: SVGElement | null) => {
          nodes.push(node);
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null, ref }));
          });
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.25"><rect/></svg>';
          });

          expect(nodes).toEqual([host.querySelector('svg')]);
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give a copy the style of a replaced svg', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-replaced',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null }));
          });
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="fill-opacity:0.25"><rect/></svg>';
          });

          expect(host.querySelector('svg')?.getAttribute('style')).toBe(
            'fill-opacity:0.25'
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should remove the style of a copy when the replaced svg has none', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-removed',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null }));
          });
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
          });

          expect(host.querySelector('svg')?.hasAttribute('style')).toBe(false);
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give the svg of a copy to a ref that changes', async () => {
        const first = React.createRef<SVGElement>();
        const second = React.createRef<SVGElement>();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(fooIcon.react, { tag: null, ref: first })
            );
          });
          await act(async () => {
            root.render(
              React.createElement(fooIcon.react, { tag: null, ref: second })
            );
          });

          expect(second.current).toBe(host.querySelector('svg'));
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give the svg of a copy with a root style to a ref that changes', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:styled-ref-changes',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const first = React.createRef<SVGElement>();
        const second = React.createRef<SVGElement>();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(icon.react, { tag: null, ref: first })
            );
          });
          await act(async () => {
            root.render(
              React.createElement(icon.react, { tag: null, ref: second })
            );
          });

          expect(second.current).toBe(host.querySelector('svg'));
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should keep the style of a replaced svg when the ref of a copy changes', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:style-replaced-ref-changes',
          svgstr:
            '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>'
        });
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(icon.react, { tag: null, ref: () => null })
            );
          });
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.25"><rect/></svg>';
          });
          await act(async () => {
            root.render(
              React.createElement(icon.react, { tag: null, ref: () => null })
            );
          });

          expect(host.querySelector('svg')?.getAttribute('style')).toBe(
            'opacity:0.25'
          );
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should not call a callback ref again when a copy without a root style renders again', async () => {
        const nodes: (SVGElement | null)[] = [];
        const ref = (node: SVGElement | null) => {
          nodes.push(node);
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(
              React.createElement(fooIcon.react, {
                tag: null,
                ref,
                className: 'a'
              })
            );
          });
          await act(async () => {
            root.render(
              React.createElement(fooIcon.react, {
                tag: null,
                ref,
                className: 'b'
              })
            );
          });

          expect(nodes).toEqual([host.querySelector('svg')]);
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give a callback ref a new svg when only the replaced svg has a root style', async () => {
        const icon = new LabIcon({
          name: 'test-ui-components:switch-kind',
          svgstr: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
        });
        const nodes: (SVGElement | null)[] = [];
        const ref = (node: SVGElement | null) => {
          nodes.push(node);
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(icon.react, { tag: null, ref }));
          });
          const first = host.querySelector('svg');
          await act(async () => {
            icon.svgstr =
              '<svg xmlns="http://www.w3.org/2000/svg" style="opacity:0.5"><rect/></svg>';
          });
          const second = host.querySelector('svg');

          expect(nodes).toEqual([first, null, second]);
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });

      it('should give the svg of a copy to a callback ref', async () => {
        const nodes: (SVGElement | null)[] = [];
        const ref = (node: SVGElement | null) => {
          nodes.push(node);
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);

        try {
          await act(async () => {
            root.render(React.createElement(fooIcon.react, { tag: null, ref }));
          });

          expect(nodes).toEqual([host.querySelector('svg')]);
        } finally {
          act(() => root.unmount());
          host.remove();
        }
      });
    });
  });
});
