// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LabIcon } from '@jupyterlab/ui-components';
import * as fs from 'fs';
import * as path from 'path';

const fooSvgstr = fs.readFileSync(path.join(__dirname, 'foo.svg'), {
  encoding: 'utf8'
});

const fooIcon = new LabIcon({
  name: 'test-ui-components:foo',
  svgstr: fooSvgstr
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
  });
});
