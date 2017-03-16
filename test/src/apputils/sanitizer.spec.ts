// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  defaultSanitizer
} from '@jupyterlab/apputils';


describe('defaultSanitizer', () => {

  describe('#sanitize()', () => {

    it('should allow svg tags', () => {
      let svg = '<svg>foo</svg>';
      expect(defaultSanitizer.sanitize(svg)).to.be(svg);
    });

    it('should allow h1 tags', () => {
      let h1 = '<h1>foo</h1>';
      expect(defaultSanitizer.sanitize(h1)).to.be(h1);
    });

    it('should allow h2 tags', () => {
      let h2 = '<h2>foo</h2>';
      expect(defaultSanitizer.sanitize(h2)).to.be(h2);
    });

    it('should allow img tags and some attributes', () => {
      let img = '<img src="smiley.gif" alt="Smiley face" height="42" width="42" />';
      expect(defaultSanitizer.sanitize(img)).to.be(img);
    });

    it('should allow span tags and class attribute', () => {
      let span = '<span class="foo">bar</span>';
      expect(defaultSanitizer.sanitize(span)).to.be(span);
    });

    it('should set the rel attribute for <a> tags to "nofollow', () => {
      let a ='<a rel="foo" href="bar">Baz</a>';
      let expected = a.replace('foo', 'nofollow');
      expect(defaultSanitizer.sanitize(a)).to.be(expected);
    });

    it('should allow the class attribute for code tags', () => {
      let code = '<code class="foo">bar</code>';
      expect(defaultSanitizer.sanitize(code)).to.be(code);
    });

    it('should strip script tags', () => {
      let script = '<script>alert("foo")</script>';
      expect(defaultSanitizer.sanitize(script)).to.be('');
    });

    it('should strip link tags', () => {
      let link = '<link rel="stylesheet" type="text/css" href="theme.css">';
      expect(defaultSanitizer.sanitize(link)).to.be('');
    });

    it('should pass through simple well-formed whitelisted markup', () => {
      let div = '<div><p>Hello <b>there</b></p></div>';
      expect(defaultSanitizer.sanitize(div)).to.be(div);
    });

  });

});
