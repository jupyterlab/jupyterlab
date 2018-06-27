// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  defaultSanitizer
} from '@jupyterlab/apputils';


describe('defaultSanitizer', () => {

  describe('#sanitize()', () => {

    it('should allow h1 tags', () => {
      let h1 = '<h1>foo</h1>';
      expect(defaultSanitizer.sanitize(h1)).to.be(h1);
    });

    it('should allow h2 tags', () => {
      let h2 = '<h2>foo</h2>';
      expect(defaultSanitizer.sanitize(h2)).to.be(h2);
    });

    it('should not allow svg tags', () => {
      let svg = '<svg>foo</svg>';
      expect(defaultSanitizer.sanitize(svg)).to.be('foo');
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

    it('should allow the class attribute for div tags', () => {
      let div = '<div class="foo">bar</div>';
      expect(defaultSanitizer.sanitize(div)).to.be(div);
    });

    it('should allow the class attribute for p tags', () => {
      let p = '<p class="foo">bar</p>';
      expect(defaultSanitizer.sanitize(p)).to.be(p);
    });

    it('should allow the class attribute for pre tags', () => {
      let pre = '<pre class="foo">bar</pre>';
      expect(defaultSanitizer.sanitize(pre)).to.be(pre);
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

    it('should allow video tags with some attributes', () => {
      let video = '<video src="my/video.mp4" height="42" width="42"' +
                  ' autoplay controls loop muted></video>';
      expect(defaultSanitizer.sanitize(video)).to.be(video);
    });

    it('should allow audio tags with some attributes', () => {
      let audio = '<audio src="my/audio.ogg autoplay loop ' +
                  'controls muted"></audio>';
      expect(defaultSanitizer.sanitize(audio)).to.be(audio);
    });

    it('should allow input tags but disable them', () => {
      let html = defaultSanitizer.sanitize('<input type="checkbox" checked />');
      let div = document.createElement('div');
      let input: HTMLInputElement;

      div.innerHTML = html;
      input = div.querySelector('input');

      expect(input.disabled).to.be(true);
    });

  });

});
