// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { FileBrowser } from '@jupyterlab/filebrowser';
import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, test } from '@jupyterlab/galata';
import type { LabIcon, ReactWidget } from '@jupyterlab/ui-components';
import type { Widget } from '@lumino/widgets';

const HOST = 'jp-labicon-test-host';
const BLUE = [0, 0, 255];
const RED = [255, 0, 0];

/**
 * An svg of 32 by 32 pixels with the given content.
 */
function svg(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32" viewBox="0 0 32 32">${content}</svg>`;
}

/**
 * A gradient of one colour, so that a shape that uses it has that colour.
 */
function gradient(id: string, color: string): string {
  return `<linearGradient id="${id}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}"/></linearGradient>`;
}

/**
 * Render one copy of an icon for each item of `icons`, side by side on top of
 * the page, with `element()` or with the React component, and hide the first
 * copy if asked. Give the text of the style elements of each copy, and the
 * computed value of `property` for the first element of each selector.
 */
async function renderCopies(
  page: IJupyterLabPageFixture,
  icons: { name: string; svgstr: string }[],
  {
    selectors = [],
    property = 'fill',
    hideFirst = true,
    react = false
  }: {
    selectors?: string[];
    property?: string;
    hideFirst?: boolean;
    react?: boolean;
  } = {}
): Promise<{ styles: string[]; values: (string | null)[] }[]> {
  return page.evaluate(
    async ({ host, icons, selectors, property, hideFirst, react }) => {
      const app = window.jupyterapp;
      const LabIconClass = app.docRegistry.getFileType('text')!.icon!
        .constructor as typeof LabIcon;
      const container = document.createElement('div');
      container.id = host;
      container.style.cssText =
        'position: fixed; left: 0; top: 0; z-index: 10000; width: 400px; height: 40px; background: #fff';
      document.body.appendChild(container);
      const created = new Map<string, LabIcon>();
      const boxes = icons.map(({ name, svgstr }, index) => {
        const box = document.createElement('div');
        box.id = `${host}-${index}`;
        box.style.cssText = `position: absolute; left: ${index * 40}px; top: 0; width: 32px; height: 32px`;
        container.appendChild(box);
        if (!created.has(name)) {
          created.set(name, new LabIconClass({ name, svgstr }));
        }
        return box;
      });
      if (react) {
        // ReactWidget, as the class of a file browser toolbar button, renders
        // the React component of the icon; the page has no React of its own
        const browser = Array.from(app.shell.widgets('left')).find(
          widget => widget.id === 'filebrowser'
        ) as FileBrowser;
        let ReactWidgetClass: typeof ReactWidget | null = null;
        for (const item of browser.toolbar.children()) {
          for (
            let type = item.constructor;
            type && !ReactWidgetClass;
            type = Object.getPrototypeOf(type)
          ) {
            if (Object.prototype.hasOwnProperty.call(type, 'create')) {
              ReactWidgetClass = type as typeof ReactWidget;
            }
          }
        }
        const WidgetClass = Object.getPrototypeOf(
          ReactWidgetClass
        ) as typeof Widget;
        boxes.forEach((box, index) => {
          const icon = created.get(icons[index].name)!;
          WidgetClass.attach(
            ReactWidgetClass!.create(
              LabIconClass.resolveReact({ icon, tag: null })
            ),
            box
          );
        });
        await new Promise<void>(resolve => {
          const check = () =>
            boxes.every(box => box.querySelector('svg'))
              ? resolve()
              : requestAnimationFrame(check);
          check();
        });
      } else {
        boxes.forEach((box, index) =>
          created.get(icons[index].name)!.element({ container: box })
        );
      }
      if (hideFirst) {
        boxes[0].style.display = 'none';
      }
      return boxes.map(box => ({
        styles: Array.from(
          box.querySelectorAll('style'),
          style => style.textContent ?? ''
        ),
        values: selectors.map(selector => {
          const element = box.querySelector(selector);
          return element
            ? getComputedStyle(element).getPropertyValue(property)
            : null;
        })
      }));
    },
    { host: HOST, icons, selectors, property, hideFirst, react }
  );
}

/**
 * Render two copies of an icon, and hide the first one if asked.
 */
function renderTwice(
  page: IJupyterLabPageFixture,
  name: string,
  svgstr: string,
  options: Parameters<typeof renderCopies>[2] = {}
) {
  return renderCopies(
    page,
    [
      { name, svgstr },
      { name, svgstr }
    ],
    options
  );
}

/**
 * An icon with keyframes of the given name that give a red fill. Rendered
 * after another icon, it has the last keyframes of this name on the page.
 */
function redKeyframes(name: string): { name: string; svgstr: string } {
  return {
    name: `test-labicon:red-${name}`,
    svgstr: svg(`<style>@keyframes ${name}{from,to{fill:#f00}}</style>`)
  };
}

/**
 * The colour of the pixel at the centre of a copy on the screen.
 */
async function centerColor(
  page: IJupyterLabPageFixture,
  index: number
): Promise<number[]> {
  const png = await page.locator(`#${HOST}-${index}`).screenshot();
  return page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: 'image/png' })
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const pixel = context.getImageData(
      bitmap.width >> 1,
      bitmap.height >> 1,
      1,
      1
    ).data;
    return Array.from(pixel.slice(0, 3));
  }, png.toString('base64'));
}

test.describe('LabIcon copies of an svg with a style element', () => {
  test('should have the same style text in every copy', async ({ page }) => {
    const svgstr = svg(
      `<style>#g stop{stop-color:#00f}.a{fill:url(#g)}</style><defs>${gradient('g', '#000')}</defs><rect class="a" width="32" height="32"/>`
    );

    const copies = await renderTwice(page, 'test-labicon:same-text', svgstr);

    expect(copies[1].styles).toEqual(copies[0].styles);
  });

  test('should render a gradient that a rule names in a React copy when the first copy is hidden', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a{fill:url(#g)}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:react-url', svgstr, { react: true });

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should render a gradient that a rule inside @media names when the first copy is hidden', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a{fill:url(#light)}@media all{.a{fill:url(#dark)}}</style><defs>${gradient('light', '#f00')}${gradient('dark', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:media-url', svgstr);

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should render a gradient that a keyframe names when the first copy is hidden', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@keyframes test-labicon-k{from,to{fill:url(#g)}}.a{animation:test-labicon-k 1s infinite paused}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:keyframes-url', svgstr);

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should animate a rule whose animation holds a var() with keyframes of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@keyframes test-labicon-v{from,to{fill:#00f}}.a{--test-labicon-d:1s;animation:test-labicon-v var(--test-labicon-d) infinite paused}</style><rect class="a" width="32" height="32"/>'
    );

    const copies = await renderCopies(
      page,
      [
        { name: 'test-labicon:var-animation', svgstr },
        redKeyframes('test-labicon-v')
      ],
      { selectors: ['rect'], hideFirst: false }
    );

    expect(copies[0].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should keep the priority of an animation that names keyframes of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@keyframes test-labicon-p{from,to{fill:#00f}}.a{animation:test-labicon-p 1s infinite paused !important}.a.b{animation:none}</style><rect class="a b" width="32" height="32"/>'
    );

    const copies = await renderCopies(
      page,
      [{ name: 'test-labicon:important-animation', svgstr }],
      { selectors: ['rect'], hideFirst: false }
    );

    expect(copies[0].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should animate an element whose style attribute names keyframes of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@keyframes test-labicon-inline{from,to{fill:#00f}}</style><rect style="animation:test-labicon-inline 1s infinite paused" width="32" height="32"/>'
    );

    const copies = await renderCopies(
      page,
      [
        { name: 'test-labicon:inline-keyframes', svgstr },
        redKeyframes('test-labicon-inline')
      ],
      { selectors: ['rect'], hideFirst: false }
    );

    expect(copies[0].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should animate an element that names keyframes of the svg through a custom property', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@keyframes test-labicon-c{from,to{fill:#00f}}g{--test-labicon-n:test-labicon-c}rect{animation:var(--test-labicon-n) 1s infinite paused}</style><g><rect width="32" height="32"/></g>'
    );

    const copies = await renderCopies(
      page,
      [{ name: 'test-labicon:custom-property-animation', svgstr }],
      { selectors: ['rect'], hideFirst: false }
    );

    expect(copies[0].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should animate a rule with keyframes that a scope rule holds', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@scope (.a) { @keyframes test-labicon-scoped { from, to { fill: #00f } } rect { animation: test-labicon-scoped 1s infinite paused } }</style><g class="a"><rect width="32" height="32"/></g>'
    );

    const fill = await page.evaluate(svgstr => {
      const LabIconClass = window.jupyterapp.docRegistry.getFileType('text')!
        .icon!.constructor as typeof LabIcon;
      const box = document.createElement('div');
      document.body.appendChild(box);
      try {
        new LabIconClass({
          name: 'test-labicon:scope-keyframes',
          svgstr
        }).element({ container: box });
      } catch (error) {
        return String(error);
      }
      return getComputedStyle(box.querySelector('rect')!).fill;
    }, svgstr);

    expect(fill).toEqual('rgb(0, 0, 255)');
  });

  test('should render a gradient that nested declarations name when the first copy is hidden', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a{&amp; .b{fill:#f00} fill:url(#g)}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:nested-declarations-url', svgstr);

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should render a registered property of a style sheet with a layer statement before its namespace', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@layer base; @namespace xlink url(http://www.w3.org/1999/xlink); @property --test-labicon-n{syntax:"&lt;url&gt;";inherits:false;initial-value:url(#g)}.a{fill:var(--test-labicon-n)}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );

    const fill = await page.evaluate(svgstr => {
      const LabIconClass = window.jupyterapp.docRegistry.getFileType('text')!
        .icon!.constructor as typeof LabIcon;
      const icon = new LabIconClass({
        name: 'test-labicon:layer-namespace',
        svgstr
      });
      const box = document.createElement('div');
      document.body.appendChild(box);
      try {
        icon.element({ container: box });
      } catch (error) {
        return String(error);
      }
      return getComputedStyle(box.querySelector('rect')!).fill;
    }, svgstr);

    expect(fill).toMatch(/^url\("#g_[0-9a-z]+"\)$/);
  });

  test('should let a layer win over the initial value of a registered property after another icon declares a layer of the same name', async ({
    page
  }) => {
    const first = svg(
      '<style>@layer test-labicon-base{rect{opacity:1}}</style><rect width="32" height="32"/>'
    );
    const second = svg(
      `<style>@layer test-labicon-base{rect{--test-labicon-o:url(#h)}}@property --test-labicon-o{syntax:"&lt;url&gt;";inherits:false;initial-value:url(#g)}rect{fill:var(--test-labicon-o)}</style><defs>${gradient('g', '#f00')}${gradient('h', '#00f')}</defs><rect width="32" height="32"/>`
    );
    await renderCopies(
      page,
      [
        { name: 'test-labicon:layer-first', svgstr: first },
        { name: 'test-labicon:layer-second', svgstr: second }
      ],
      { hideFirst: false }
    );

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should let a registered property that inherits take the value of an ancestor over its initial value', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@property --test-labicon-q{syntax:"&lt;url&gt;";inherits:true;initial-value:url(#g)}g{--test-labicon-q:url(#h)}rect{fill:var(--test-labicon-q)}</style><defs>${gradient('g', '#f00')}${gradient('h', '#00f')}</defs><g><rect width="32" height="32"/></g>`
    );
    await renderTwice(page, 'test-labicon:property-inherited', svgstr);

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should apply a rule to the copy of an element that a use element shows', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>.k{fill:#00f}</style><defs><rect id="r" class="k" width="32" height="32"/></defs><use href="#r"/>'
    );
    await renderTwice(page, 'test-labicon:use-copy', svgstr);

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should not give a renamed id a value that a selector of the svg names', async ({
    page
  }) => {
    const { count, id } = await page.evaluate(() => {
      const LabIconClass = window.jupyterapp.docRegistry.getFileType('text')!
        .icon!.constructor as typeof LabIcon;
      const counter = Symbol.for(
        '@jupyterlab/ui-components:LabIcon.idSuffixCounter'
      );
      const count =
        (window as unknown as Record<symbol, number | undefined>)[counter] ?? 0;
      // the scope of the icon takes the next count, and its first copy the one after
      const taken = `g_${(count + 2).toString(36)}`;
      const icon = new LabIconClass({
        name: 'test-labicon:selector-names-suffix',
        svgstr: `<svg xmlns="http://www.w3.org/2000/svg"><style>#${taken}{opacity:0.5}</style><linearGradient id="g"/><rect fill="url(#g)"/></svg>`
      });
      const copy = icon.element({ tag: null });
      return { count, id: copy.querySelector('linearGradient')!.id };
    });

    expect(id).toEqual(`g_${(count + 3).toString(36)}`);
  });

  test('should read the url() of a rule when code replaces the style attribute of the root', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a{fill:url(#g)}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:replaced-style', svgstr);

    const fill = await page.evaluate(host => {
      const copy = document.querySelector<SVGSVGElement>(`#${host}-1 svg`)!;
      copy.style.cssText = 'opacity: 1';
      return getComputedStyle(copy.querySelector('rect')!).fill;
    }, HOST);
    expect(fill).toEqual('url("#g")');
  });

  test('should match a style attribute selector against the style of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a{fill:url(#g)}svg[style*="opacity"] .a{fill:#f00}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    ).replace('<svg ', '<svg style="opacity:1" ');
    await renderTwice(page, 'test-labicon:root-style-attribute', svgstr);

    expect(await centerColor(page, 1)).toEqual(RED);
  });

  test('should match an id attribute selector against the id of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>[id$="0"]{fill:#f00}</style><rect id="r0" width="16" height="32" fill="#00f"/><use href="#r0" x="16"/>`
    );

    const copies = await renderTwice(
      page,
      'test-labicon:id-attribute',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should match an XLink href attribute selector against the href of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@namespace xlink url(http://www.w3.org/1999/xlink); use[xlink|href="#r"]{fill:#f00}</style><rect id="r" width="16" height="32"/><use xlink:href="#r" x="16"/>`
    );

    const copies = await renderTwice(
      page,
      'test-labicon:xlink-attribute',
      svgstr,
      {
        selectors: ['use']
      }
    );

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should not match a style attribute selector against the custom properties of a copy', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a{fill:url(#g)}svg[style] .a{fill:#f00}</style><defs>${gradient('g', '#00f')}</defs><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:style-attribute', svgstr);

    expect(await centerColor(page, 1)).toEqual(BLUE);
  });

  test('should match :scope in a nested rule against the root of the svg', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.b{:scope > .a > &amp;{fill:#f00}}</style><g class="a"><rect class="b" width="32" height="32" fill="#00f"/></g>`
    );

    const copies = await renderTwice(
      page,
      'test-labicon:nested-scope',
      svgstr,
      { selectors: ['rect'] }
    );

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should apply a scope rule whose root is a renamed id', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@scope (#g) { rect { fill: #f00 } }</style><g id="g"><rect width="16" height="32" fill="#00f"/></g><use href="#g" x="16"/>`
    );

    const copies = await renderTwice(page, 'test-labicon:scope-rule', svgstr, {
      selectors: ['rect']
    });

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should end a scope rule without a start at a renamed id', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@scope to (#g){rect{fill:#f00}}</style><g id="g"><rect width="32" height="32" fill="#00f"/></g><use href="#g"/>`
    );

    const copies = await renderTwice(
      page,
      'test-labicon:scope-end-only',
      svgstr,
      {
        selectors: ['g rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should match :scope in the end of a scope rule against the root of the scope', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@scope (.a) to (:scope > .b) { rect { fill: #f00 } }</style><g class="a"><g class="b"><rect width="16" height="32" fill="#00f"/></g><rect class="c" x="16" width="16" height="32" fill="#00f"/></g>`
    );

    const copies = await renderTwice(page, 'test-labicon:scope-end', svgstr, {
      selectors: ['.b rect', '.c']
    });

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)', 'rgb(255, 0, 0)']);
  });

  test('should match :scope in a scope rule against the root of the scope', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@scope (.a) { :scope > rect { fill: #f00 } }</style><g class="a"><rect width="32" height="32" fill="#00f"/></g>`
    );

    const copies = await renderTwice(page, 'test-labicon:scope-body', svgstr, {
      selectors: ['rect']
    });

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should resolve & in the start of a nested scope rule to its parent rule', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>.a { @scope (&amp; > .b) { rect { fill: #f00 } } }</style><g class="a"><g class="b"><rect width="32" height="32" fill="#00f"/></g></g>`
    );

    const copies = await renderTwice(
      page,
      'test-labicon:nested-scope-start',
      svgstr,
      { selectors: ['rect'] }
    );

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should resolve & in a scope rule to the root of its scope', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@scope (.a) { &amp; > rect { fill: #f00 } }</style><g class="a"><rect width="32" height="32" fill="#00f"/></g>'
    );

    const copies = await renderTwice(
      page,
      'test-labicon:scope-nesting',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(255, 0, 0)']);
  });

  test('should apply the declarations of a scope rule to the copies of its icon only', async ({
    page
  }) => {
    await renderCopies(
      page,
      [
        {
          name: 'test-labicon:scope-declarations-1',
          svgstr: svg(
            '<style>@scope (.cls-1){fill:#00f}</style><rect class="cls-1" width="32" height="32"/>'
          )
        },
        {
          name: 'test-labicon:scope-declarations-2',
          svgstr: svg(
            '<style>@scope (.cls-1){fill:#f00}</style><rect class="cls-1" width="32" height="32"/>'
          )
        }
      ],
      { hideFirst: false }
    );

    expect(await centerColor(page, 0)).toEqual(BLUE);
  });

  test('should apply a rule that reads the theme attribute of the page', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>[data-jp-theme-light='true'] .a{fill:#00f}[data-jp-theme-light='false'] .a{fill:#f00}</style><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:theme', svgstr);

    const fills = await page.evaluate(host => {
      const rect = document.querySelector(`#${host}-1 rect`)!;
      const light = getComputedStyle(rect).fill;
      document.body.dataset.jpThemeLight = 'false';
      const dark = getComputedStyle(rect).fill;
      document.body.dataset.jpThemeLight = 'true';
      return [light, dark];
    }, HOST);
    expect(fills).toEqual(['rgb(0, 0, 255)', 'rgb(255, 0, 0)']);
  });

  test('should apply a nested rule whose parent rule matches an element of the page', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>[data-jp-theme-light='true'] { .a { fill: #00f } }</style><rect class="a" width="32" height="32"/>`
    );

    const copies = await renderTwice(
      page,
      'test-labicon:theme-parent',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should not apply the declarations of a parent rule to an element of the page', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>[data-jp-theme-light='true'] { --test-labicon-page: 1; .a { fill: #00f } }</style><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:theme-parent-declarations', svgstr);

    const value = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('--test-labicon-page')
    );
    expect(value).toEqual('');
  });

  test('should not apply the declarations after the nested rules of a parent rule to an element of the page', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>[data-jp-theme-light='true'] { .a { fill: #00f } --test-labicon-after: 1 }</style><rect class="a" width="32" height="32"/>`
    );
    await renderTwice(page, 'test-labicon:theme-parent-after', svgstr);

    const value = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('--test-labicon-after')
    );
    expect(value).toEqual('');
  });

  test('should let a nested rule win over the declarations of its parent rule', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>.a { fill: #f00; &amp; { fill: #00f } }</style><rect class="a" width="32" height="32"/>'
    );

    const copies = await renderTwice(
      page,
      'test-labicon:nested-order',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should let the declarations after a nested rule win over it', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>.a { &amp; { fill: #f00 } fill: #00f }</style><rect class="a" width="32" height="32"/>'
    );

    const copies = await renderTwice(
      page,
      'test-labicon:nested-declarations-order',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should keep the specificity of each selector of a rule for the declarations after its nested rules', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>.a.b { fill: #00f } #r, .a { .c { opacity: 1 } fill: #f00 }</style><rect class="a b" width="32" height="32"/>'
    );

    const copies = await renderTwice(
      page,
      'test-labicon:nested-declarations-specificity',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should keep the declarations of an at-rule inside a style rule under its condition', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>.a { fill: #00f; .x { fill: #0f0 } @media (max-width: 1px) { fill: #f00 } }</style><rect class="a" width="32" height="32"/>'
    );

    const copies = await renderTwice(
      page,
      'test-labicon:media-in-rule',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should keep the declarations after the nested rules of a rule inside an at-rule under its condition', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>@media (max-width: 1px) { .a { .x { fill: #0f0 } fill: #f00 } }</style><rect class="a" width="32" height="32" fill="#00f"/>'
    );

    const copies = await renderTwice(
      page,
      'test-labicon:rule-in-media',
      svgstr,
      {
        selectors: ['rect']
      }
    );

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should match a part of a selector that names an id of the page', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>#${HOST} .a{fill:#00f}</style><rect class="a" width="32" height="32" fill="#f00"/>`
    );

    const copies = await renderTwice(page, 'test-labicon:page-id', svgstr, {
      selectors: ['.a']
    });

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should match a part of a selector that names an id of the svg only inside the copy', async ({
    page
  }) => {
    // the host of the copies on the page has the id of the group
    const svgstr = svg(
      `<style>#${HOST} rect{fill:#f00}</style><g id="${HOST}"><rect width="16" height="32" fill="#00f"/></g><rect class="outside" x="16" width="16" height="32" fill="#00f"/>`
    );

    const copies = await renderTwice(page, 'test-labicon:id-ancestor', svgstr, {
      selectors: ['.outside']
    });

    expect(copies[1].values).toEqual(['rgb(0, 0, 255)']);
  });

  test('should apply the rules of an icon to an element added to a copy', async ({
    page
  }) => {
    const svgstr = svg(
      '<style>.badge{fill:#f00}</style><rect width="32" height="32" fill="#00f"/>'
    );
    await renderTwice(page, 'test-labicon:added-element', svgstr);

    const fill = await page.evaluate(host => {
      const badge = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      badge.setAttribute('class', 'badge');
      document.querySelector(`#${host}-1 svg`)!.appendChild(badge);
      return getComputedStyle(badge).fill;
    }, HOST);
    expect(fill).toEqual('rgb(255, 0, 0)');
  });

  test('should give a new reference in a copy that is given again as an svg its own custom property', async ({
    page
  }) => {
    await renderCopies(
      page,
      [
        {
          name: 'test-labicon:given-again-url-1',
          svgstr: svg(
            `<style>.a{fill:url(#g)}</style><defs>${gradient('g', '#f00')}${gradient('h', '#00f')}</defs><rect class="a" width="32" height="32"/><rect class="b" width="4" height="4" fill="url(#h)"/>`
          )
        }
      ],
      { hideFirst: false }
    );

    const fills = await page.evaluate(host => {
      const LabIconClass = window.jupyterapp.docRegistry.getFileType('text')!
        .icon!.constructor as typeof LabIcon;
      const copy = document.querySelector(`#${host}-0 svg`)!;
      // a rule that names the second gradient of the copy, added by hand
      const gradient = copy.querySelectorAll('linearGradient')[1].id;
      const svgstr = copy.outerHTML.replace(
        '</style>',
        `.b{fill:url(#${gradient})}</style>`
      );
      const icon = new LabIconClass({
        name: 'test-labicon:given-again-url-2',
        svgstr
      });
      const box = document.createElement('div');
      document.getElementById(host)!.appendChild(box);
      icon.element({ container: box });
      return Array.from(
        box.querySelectorAll('rect'),
        rect => getComputedStyle(rect).fill
      ).join(' ');
    }, HOST);
    expect(fills).toMatch(
      /^url\("#g_[0-9a-z]+_[0-9a-z]+"\) url\("#h_[0-9a-z]+_[0-9a-z]+"\)$/
    );
  });

  test('should give a copy that is given again as an svg the style text of the first copy', async ({
    page
  }) => {
    const svgstr = svg(
      `<style>@keyframes test-labicon-g{from,to{opacity:1}}#g stop{stop-color:#00f}.a{fill:url(#g);animation:test-labicon-g 1s paused}</style><defs>${gradient('g', '#000')}</defs><rect class="a" width="32" height="32"/>`
    );

    const texts = await page.evaluate(svgstr => {
      const LabIconClass = window.jupyterapp.docRegistry.getFileType('text')!
        .icon!.constructor as typeof LabIcon;
      const result: string[] = [];
      for (let round = 0; round < 3; round++) {
        const icon = new LabIconClass({
          name: `test-labicon:given-again-text-${round}`,
          svgstr
        });
        try {
          const copy = icon.element({ tag: null });
          result.push(copy.querySelector('style')!.textContent ?? '');
          svgstr = copy.outerHTML;
        } catch (error) {
          result.push(String(error));
        }
      }
      return result;
    }, svgstr);

    // the same text but for the value of data-icon-scope
    const scopes = texts.map(text =>
      text.replace(/(data-icon-scope="|-jp-icon-)[0-9a-z]+/g, '$1')
    );
    expect(scopes[2]).toEqual(scopes[0]);
  });

  test('should animate the keyframes of a copy that is given again as an svg', async ({
    page
  }) => {
    await renderCopies(
      page,
      [
        {
          name: 'test-labicon:given-again-keyframes-1',
          svgstr: svg(
            '<style>@keyframes test-labicon-again{from{fill:#00f}to{fill:#00f}}.a{animation:test-labicon-again 1s infinite paused}</style><rect class="a" width="32" height="32"/>'
          )
        }
      ],
      { hideFirst: false }
    );

    const fill = await page.evaluate(host => {
      const LabIconClass = window.jupyterapp.docRegistry.getFileType('text')!
        .icon!.constructor as typeof LabIcon;
      // the style text of the copy writes from and to as 0% and 100%
      const svgstr = document.querySelector(`#${host}-0 svg`)!.outerHTML;
      const box = document.createElement('div');
      document.getElementById(host)!.appendChild(box);
      try {
        new LabIconClass({
          name: 'test-labicon:given-again-keyframes-2',
          svgstr
        }).element({ container: box });
      } catch (error) {
        return String(error);
      }
      return getComputedStyle(box.querySelector('rect')!).fill;
    }, HOST);
    expect(fill).toEqual('rgb(0, 0, 255)');
  });
});
