// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeMirrorModel
} from '../../../lib/codemirror';



describe('CodeMirrorModel', () => {

  let model: CodeMirrorModel;

  beforeEach(() => {
    model = new CodeMirrorModel();
  });

  describe('#constructor()', () => {

    it('should create a CodeMirrorModel', () => {
      expect(model).to.be.a(CodeMirrorModel);
    });

  });

});
