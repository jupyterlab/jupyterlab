// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  GenericSearchProvider,
  IGenericSearchMatch,
  FOUND_CLASSES
} from '@jupyterlab/documentsearch';
import { Widget } from '@lumino/widgets';

const MATCH_CLASSES = FOUND_CLASSES.join(' ');

describe('documentsearch/genericsearchprovider', () => {
  describe('GenericSearchProvider', () => {
    let provider: GenericSearchProvider;
    let widget: Widget;
    let match: IGenericSearchMatch;

    beforeEach(() => {
      provider = new GenericSearchProvider();
      widget = new Widget();
    });

    afterEach(async () => {
      await provider.endSearch();
      widget.dispose();
    });

    function getHTMLForMatch(match: IGenericSearchMatch): string | undefined {
      return match.spanElement?.closest('pre')?.innerHTML;
    }

    async function queryOne(query: RegExp): Promise<IGenericSearchMatch> {
      let matches = (await provider.startQuery(
        query,
        widget
      )) as IGenericSearchMatch[];
      expect(matches).toHaveLength(1);
      return matches[0];
    }

    describe('#startQuery()', () => {
      it('should highlight text fragment nested in a node', async () => {
        widget.node.innerHTML = '<pre>xyz</pre>';
        match = await queryOne(/x/);
        expect(getHTMLForMatch(match)).toBe(
          `<span class="${MATCH_CLASSES}">x</span>yz`
        );

        match = await queryOne(/y/);
        expect(getHTMLForMatch(match)).toBe(
          `x<span class="${MATCH_CLASSES}">y</span>z`
        );

        match = await queryOne(/z/);
        expect(getHTMLForMatch(match)).toBe(
          `xy<span class="${MATCH_CLASSES}">z</span>`
        );
      });

      it('should highlight in presence of nested spans adjacent to text nodes', async () => {
        widget.node.innerHTML = '<pre><span>x</span>yz</pre>';
        match = await queryOne(/x/);
        expect(getHTMLForMatch(match)).toBe(
          `<span><span class="${MATCH_CLASSES}">x</span></span>yz`
        );

        match = await queryOne(/y/);
        expect(getHTMLForMatch(match)).toBe(
          `<span>x</span><span class="${MATCH_CLASSES}">y</span>z`
        );

        match = await queryOne(/z/);
        expect(getHTMLForMatch(match)).toBe(
          `<span>x</span>y<span class="${MATCH_CLASSES}">z</span>`
        );

        widget.node.innerHTML = '<pre>x<span>y</span>z</pre>';
        match = await queryOne(/x/);
        expect(getHTMLForMatch(match)).toBe(
          `<span class="${MATCH_CLASSES}">x</span><span>y</span>z`
        );

        match = await queryOne(/y/);
        expect(getHTMLForMatch(match)).toBe(
          `x<span><span class="${MATCH_CLASSES}">y</span></span>z`
        );

        match = await queryOne(/z/);
        expect(getHTMLForMatch(match)).toBe(
          `x<span>y</span><span class="${MATCH_CLASSES}">z</span>`
        );

        widget.node.innerHTML = '<pre>xy<span>z</span></pre>';
        match = await queryOne(/x/);
        expect(getHTMLForMatch(match)).toBe(
          `<span class="${MATCH_CLASSES}">x</span>y<span>z</span>`
        );

        match = await queryOne(/y/);
        expect(getHTMLForMatch(match)).toBe(
          `x<span class="${MATCH_CLASSES}">y</span><span>z</span>`
        );

        match = await queryOne(/z/);
        expect(getHTMLForMatch(match)).toBe(
          `xy<span><span class="${MATCH_CLASSES}">z</span></span>`
        );
      });

      it('should slice out the match correctly in nested nodes', async () => {
        widget.node.innerHTML = '<pre><span>xy</span>z</pre>';
        match = await queryOne(/x/);
        expect(getHTMLForMatch(match)).toBe(
          `<span><span class="${MATCH_CLASSES}">x</span>y</span>z`
        );

        match = await queryOne(/y/);
        expect(getHTMLForMatch(match)).toBe(
          `<span>x<span class="${MATCH_CLASSES}">y</span></span>z`
        );
      });
    });
  });
});
