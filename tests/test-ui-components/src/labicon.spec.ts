// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { LabIcon } from '@jupyterlab/ui-components';

import fooSvgstr from '../svg/foo.svg';
const fooIcon = new LabIcon({
  name: 'test-ui-components:foo',
  svgstr: fooSvgstr
});

describe('@jupyterlab/ui-components', () => {
  describe('svg import', () => {
    it('should hold a string with the raw contents of an svg', () => {
      expect(fooSvgstr).to.be.string;
      expect(
        fooSvgstr.startsWith(`<svg width="24" height="24" viewBox="0 0 24 24"`)
      ).to.be.true;
    });
  });

  describe('LabIcon', () => {
    describe('attribute .svgstr', () => {
      it('should hold a string with the raw contents of an svg', () => {
        expect(fooIcon.svgstr).to.be.string;
        expect(
          fooIcon.svgstr.startsWith(
            `<svg width="24" height="24" viewBox="0 0 24 24"`
          )
        ).to.be.true;
      });
    });
  });
});
