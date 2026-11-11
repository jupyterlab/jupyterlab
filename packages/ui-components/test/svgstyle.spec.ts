// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISelectorContext, ISelectorPlace } from '../src/icon/svgstyle';
import {
  edit,
  renameAnimations,
  rewriteSelector,
  setStyleText,
  styleText,
  tokenize,
  urlReferences
} from '../src/icon/svgstyle';

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const FILTER = ':where([data-icon-scope="s"], [data-icon-scope="s"] *)';
const ROOT = '[data-icon]:where([data-icon-scope="s"])';
// a rule outside other rules, where :scope and & stand for the root
const TOP: ISelectorPlace = {
  scopeIsRoot: true,
  nestingIsRoot: true,
  subject: true
};

function selectorContext(
  options: Partial<ISelectorContext> = {}
): ISelectorContext {
  return {
    scope: 's',
    ids: new Set(),
    renamed: new Set(),
    changed: new Set(),
    read: new Set(),
    named: new Set(),
    namespaces: new Map(),
    ...options
  };
}

function svgStyle(content: string): Element {
  return new DOMParser().parseFromString(
    `<style xmlns="http://www.w3.org/2000/svg">${content}</style>`,
    'image/svg+xml'
  ).documentElement;
}

describe('svgstyle', () => {
  describe('tokenize()', () => {
    it('should decode an escape in a name', () => {
      expect(tokenize(String.raw`#a\.b`)).toMatchObject([
        { type: 'hash', value: 'a.b' }
      ]);
    });

    it('should take the space after a hexadecimal escape into the name', () => {
      expect(tokenize(String.raw`\31 a`)).toMatchObject([
        { type: 'ident', value: '1a', end: 5 }
      ]);
    });

    it('should decode a hexadecimal escape in a string', () => {
      expect(tokenize(String.raw`"\31 a"`)).toMatchObject([
        { type: 'string', value: '1a' }
      ]);
    });

    it('should read a hash whose name starts with an escape', () => {
      expect(tokenize(String.raw`#\31 a`)).toMatchObject([
        { type: 'hash', value: '1a' }
      ]);
    });

    it('should end a string at a newline', () => {
      expect(tokenize('"a\nb"')[0].type).toBe('bad');
    });

    it('should continue a string after an escaped newline', () => {
      expect(tokenize('"a\\\nb"')).toMatchObject([
        { type: 'string', value: 'ab' }
      ]);
    });

    it('should decode an escaped parenthesis in an unquoted url', () => {
      expect(tokenize(String.raw`url( #a\) )`)).toMatchObject([
        { type: 'url', value: '#a)', valueEnd: 9 }
      ]);
    });

    it('should drop an unquoted url with a quote', () => {
      expect(tokenize('url(a"b)')).toMatchObject([{ type: 'bad', end: 8 }]);
    });

    it('should read a quoted url as a function and a string', () => {
      expect(tokenize('url( "#a" )').map(token => token.type)).toEqual([
        'function',
        'ws',
        'string',
        'ws',
        ')'
      ]);
    });

    it('should read a comment as one token', () => {
      expect(tokenize('/* url(#a) */')).toMatchObject([
        { type: 'comment', end: 13 }
      ]);
    });
  });

  describe('urlReferences()', () => {
    it('should find unquoted, quoted and upper case url() references', () => {
      const text = `fill:url(#a);stroke:URL( "#b" );mask:url('#c')`;

      expect(urlReferences(text, () => true).map(ref => ref.id)).toEqual([
        'a',
        'b',
        'c'
      ]);
    });

    it('should give where the url() starts and ends, and where its id ends', () => {
      expect(urlReferences('x url(#a) y', () => true)).toEqual([
        { id: 'a', start: 2, end: 9, idEnd: 8 }
      ]);
    });

    it('should skip an id for which refer does not hold', () => {
      expect(urlReferences('url(#a) url(#b)', id => id === 'b')).toEqual([
        { id: 'b', start: 8, end: 15, idEnd: 14 }
      ]);
    });

    it('should skip a url() inside a string', () => {
      expect(urlReferences('content:"url(#a)"', () => true)).toEqual([]);
    });

    it('should find a quoted url() with a comment before its parenthesis', () => {
      expect(
        urlReferences('url("#a"/* c */)', () => true).map(ref => ref.id)
      ).toEqual(['a']);
    });
  });

  describe('edit()', () => {
    it('should replace each part between its start and end', () => {
      expect(
        edit('abcdef', [
          [1, 2, 'X'],
          [4, 4, 'Y']
        ])
      ).toBe('aXcdYef');
    });
  });

  describe('styleText()', () => {
    it('should read the text of a CDATA section', () => {
      expect(styleText(svgStyle('<![CDATA[.a{fill:url(#g)}]]>'))).toBe(
        '.a{fill:url(#g)}'
      );
    });

    it('should leave out the text of an element child', () => {
      expect(styleText(svgStyle('.a{}<x>.b{}</x>.c{}'))).toBe('.a{}.c{}');
    });
  });

  describe('setStyleText()', () => {
    it('should keep an element child', () => {
      const style = svgStyle('.a{}<x/>.c{}');

      setStyleText(style, '.d{}');

      expect(style.childNodes.length).toBe(3);
      expect(style.textContent).toBe('.d{}');
    });
  });

  describe('renameAnimations()', () => {
    it('should rename each name of a list of animations', () => {
      const style = document.createElement('div').style;
      style.setProperty('animation-name', 'a, b');

      renameAnimations(
        style,
        new Map([
          ['a', 'a-jp-icon-s'],
          ['b', 'b-jp-icon-s']
        ])
      );

      expect(style.getPropertyValue('animation-name')).toBe(
        'a-jp-icon-s, b-jp-icon-s'
      );
    });

    it('should rename a name that is also a keyword in the list of names', () => {
      const style = document.createElement('div').style;
      style.setProperty('animation-name', 'linear');

      renameAnimations(style, new Map([['linear', 'linear-jp-icon-s']]));

      expect(style.getPropertyValue('animation-name')).toBe('linear-jp-icon-s');
    });

    it('should keep a name that is also a keyword in a shorthand that holds var()', () => {
      const style = document.createElement('div').style;
      style.setProperty('animation', 'Linear var(--d) Linear infinite paused');

      renameAnimations(style, new Map([['Linear', 'Linear-jp-icon-s']]));

      expect(style.getPropertyValue('animation')).toBe(
        'Linear var(--d) Linear infinite paused'
      );
    });

    it('should keep a name that is also a keyword of steps() in a shorthand that holds var()', () => {
      const style = document.createElement('div').style;
      style.setProperty('animation', 'end var(--d) steps(4, end)');

      renameAnimations(style, new Map([['end', 'end-jp-icon-s']]));

      expect(style.getPropertyValue('animation')).toBe(
        'end var(--d) steps(4, end)'
      );
    });
  });

  describe('rewriteSelector()', () => {
    it('should add the filter of the copies to the subject of each selector', () => {
      expect(rewriteSelector('a > b c, d', selectorContext(), TOP)).toBe(
        `a > b c${FILTER}, d${FILTER}`
      );
    });

    it('should end a compound selector at a combinator with no space around it', () => {
      const context = selectorContext({ ids: new Set(['a']) });

      expect(rewriteSelector('#a>b', context, TOP)).toBe(
        `#a${FILTER}>b${FILTER}`
      );
    });

    it('should end a subject before the space that ends its selector', () => {
      expect(rewriteSelector('a , b', selectorContext(), TOP)).toBe(
        `a${FILTER} , b${FILTER}`
      );
    });

    it('should add the filter to a compound selector that names an id of the svg', () => {
      const context = selectorContext({ ids: new Set(['main']) });

      expect(rewriteSelector('#main rect', context, TOP)).toBe(
        `#main${FILTER} rect${FILTER}`
      );
    });

    it('should not add the filter to a compound selector that names an id the svg does not have', () => {
      expect(rewriteSelector('#main rect', selectorContext(), TOP)).toBe(
        `#main rect${FILTER}`
      );
    });

    it('should add the filter to a compound selector that reads an attribute that copies change', () => {
      const context = selectorContext({ changed: new Set(['href']) });

      expect(rewriteSelector('[href] rect', context, TOP)).toBe(
        `:is([data-original-href],[href]:where(:not([data-original-href])))${FILTER} rect${FILTER}`
      );
    });

    it('should add the filter to each compound selector of :has()', () => {
      expect(rewriteSelector('.a:has(.b .c)', selectorContext(), TOP)).toBe(
        `.a:has(.b${FILTER} .c${FILTER})${FILTER}`
      );
    });

    it('should add the filter before a pseudo-element', () => {
      expect(rewriteSelector('a::before', selectorContext(), TOP)).toBe(
        `a${FILTER}::before`
      );
    });

    it('should add the filter in :not() to a compound selector that names an id of the svg only', () => {
      const context = selectorContext({ ids: new Set(['a']) });

      expect(rewriteSelector(':not(#a .b)', context, TOP)).toBe(
        `:not(#a${FILTER} .b)${FILTER}`
      );
    });

    it('should add the filter to a compound selector that names an id after "of" in :nth-child()', () => {
      const context = selectorContext({ ids: new Set(['a']) });

      expect(rewriteSelector(':nth-child(2n+1 of #a)', context, TOP)).toBe(
        `:nth-child(2n+1 of #a${FILTER})${FILTER}`
      );
    });

    it('should leave the argument of another pseudo-class without the filter', () => {
      expect(rewriteSelector(':lang(en)', selectorContext(), TOP)).toBe(
        `:lang(en)${FILTER}`
      );
    });

    it('should leave each selector of a list in :is() before the subject without the filter', () => {
      expect(rewriteSelector(':is(.a, .b) .c', selectorContext(), TOP)).toBe(
        `:is(.a, .b) .c${FILTER}`
      );
    });

    it('should match a renamed id with the specificity of an id', () => {
      const context = selectorContext({ renamed: new Set(['a.b']) });

      expect(rewriteSelector(String.raw`#a\.b`, context, TOP)).toBe(
        String.raw`:is(#a\.b,[data-original-id=a\.b])${FILTER}`
      );
    });

    it('should record that a selector reads a renamed id', () => {
      const context = selectorContext({ renamed: new Set(['a']) });

      rewriteSelector('#a', context, TOP);

      expect(context.read).toEqual(new Set(['id']));
    });

    it('should record the ids that selectors name', () => {
      const context = selectorContext();

      rewriteSelector('#a, :not(#b)', context, TOP);

      expect(context.named).toEqual(new Set(['a', 'b']));
    });

    it('should read a changed attribute from its original value', () => {
      const context = selectorContext({ changed: new Set(['id']) });

      expect(rewriteSelector('[id$="0" i]', context, TOP)).toBe(
        `:is([data-original-id$="0" i],[id$="0" i]:where(:not([data-original-id])))${FILTER}`
      );
    });

    it('should keep a selector of an attribute that copies do not change', () => {
      const context = selectorContext({ changed: new Set(['id']) });

      expect(rewriteSelector('[class="a"]', context, TOP)).toBe(
        `[class="a"]${FILTER}`
      );
    });

    it('should read an XLink attribute through the prefix of its namespace', () => {
      const context = selectorContext({
        changed: new Set(['xlink-href']),
        namespaces: new Map([['x', XLINK_NAMESPACE]])
      });

      expect(rewriteSelector('[x|href="#a"]', context, TOP)).toBe(
        `:is([data-original-xlink-href="#a"],[x|href="#a"]:where(:not([data-original-xlink-href])))${FILTER}`
      );
    });

    it('should read the attributes of both namespaces for any namespace', () => {
      const context = selectorContext({
        changed: new Set(['href', 'xlink-href'])
      });

      expect(rewriteSelector('[*|href]', context, TOP)).toBe(
        `:is([data-original-href],[data-original-xlink-href],[*|href]:where(:not([data-original-href],[data-original-xlink-href])))${FILTER}`
      );
    });

    it('should not read the style of the root of a copy', () => {
      const context = selectorContext({ changed: new Set(['style']) });

      expect(rewriteSelector('[style]', context, TOP)).toBe(
        `:is([data-original-style],[style]:where(:not([data-original-style],[data-icon])))${FILTER}`
      );
    });

    it('should record that a selector reads a changed attribute', () => {
      const context = selectorContext({
        changed: new Set(['href', 'xlink-href'])
      });

      rewriteSelector('[*|href]', context, TOP);

      expect(context.read).toEqual(new Set(['href', 'xlink-href']));
    });

    it('should select the root of a copy for :root', () => {
      const place = { scopeIsRoot: false, nestingIsRoot: false, subject: true };

      expect(rewriteSelector(':root .a', selectorContext(), place)).toBe(
        `${ROOT} .a${FILTER}`
      );
    });

    it('should select the root of a copy for :scope where it stands for the root', () => {
      const place = { scopeIsRoot: true, nestingIsRoot: false, subject: true };

      expect(rewriteSelector(':scope', selectorContext(), place)).toBe(
        `${ROOT}${FILTER}`
      );
    });

    it('should keep :scope where it stands for the root of a scope rule', () => {
      const place = { scopeIsRoot: false, nestingIsRoot: false, subject: true };

      expect(rewriteSelector(':scope', selectorContext(), place)).toBe(
        `:scope${FILTER}`
      );
    });

    it('should select the root of a copy with no specificity for & where it stands for the root', () => {
      expect(rewriteSelector('& rect', selectorContext(), TOP)).toBe(
        `:where(${ROOT}) rect${FILTER}`
      );
    });

    it('should keep & where it stands for a parent rule', () => {
      const place = { scopeIsRoot: true, nestingIsRoot: false, subject: true };

      expect(rewriteSelector('& > rect', selectorContext(), place)).toBe(
        `& > rect${FILTER}`
      );
    });

    it('should give the scope of the icon to a selector of data-icon-scope', () => {
      expect(
        rewriteSelector('[data-icon-scope="1"]', selectorContext(), TOP)
      ).toBe(`[data-icon-scope="s"]${FILTER}`);
    });

    it('should keep a :where() of data-icon-scope that the rewrite did not write', () => {
      const author = '.a:where([data-icon-scope="x"])';

      expect(rewriteSelector(author, selectorContext(), TOP)).toBe(
        `${author}${FILTER}`
      );
    });

    it('should replace the filter of a copy that is given again as an svg', () => {
      const copy = '.a:where([data-icon-scope="1"], [data-icon-scope="1"] *)';

      expect(rewriteSelector(copy, selectorContext(), TOP)).toBe(`.a${FILTER}`);
    });

    it('should replace the root of a copy that is given again as an svg', () => {
      const copy = '[data-icon]:where([data-icon-scope="1"]) .a';

      expect(rewriteSelector(copy, selectorContext(), TOP)).toBe(
        `${ROOT} .a${FILTER}`
      );
    });

    it('should keep a renamed id of a copy that is given again as an svg', () => {
      const copy =
        ':is(#g, [data-original-id="g"]):where([data-icon-scope="1"], [data-icon-scope="1"] *) stop';

      expect(rewriteSelector(copy, selectorContext(), TOP)).toBe(
        `:is(#g, [data-original-id="g"])${FILTER} stop${FILTER}`
      );
    });

    it('should keep a changed attribute of a copy that is given again as an svg', () => {
      const context = selectorContext({ changed: new Set(['href']) });
      const copy =
        ':is([data-original-href], [href]:where(:not([data-original-href]))):where([data-icon-scope="1"], [data-icon-scope="1"] *) rect';

      expect(rewriteSelector(copy, context, TOP)).toBe(
        `:is([data-original-href], [href]:where(:not([data-original-href])))${FILTER} rect${FILTER}`
      );
    });

    it('should not add the filter to the subject of a selector that is the context of other rules', () => {
      const place = { scopeIsRoot: true, nestingIsRoot: true, subject: false };
      const context = selectorContext({ ids: new Set(['a']) });

      expect(rewriteSelector('#a .b, .c', context, place)).toBe(
        `#a${FILTER} .b, .c`
      );
    });
  });
});
