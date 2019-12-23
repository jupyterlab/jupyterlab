// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { defaultSanitizer } from '@jupyterlab/apputils';

describe('defaultSanitizer', () => {
  describe('#sanitize()', () => {
    it('should allow h1 tags', () => {
      const h1 = '<h1>foo</h1>';
      expect(defaultSanitizer.sanitize(h1)).to.equal(h1);
    });

    it('should allow h2 tags', () => {
      const h2 = '<h2>foo</h2>';
      expect(defaultSanitizer.sanitize(h2)).to.equal(h2);
    });

    it('should not allow svg tags', () => {
      const svg = '<svg>foo</svg>';
      expect(defaultSanitizer.sanitize(svg)).to.equal('foo');
    });

    it('should allow img tags and some attributes', () => {
      const img =
        '<img src="smiley.gif" alt="Smiley face" height="42" width="42" />';
      expect(defaultSanitizer.sanitize(img)).to.equal(img);
    });

    it('should allow span tags and class attribute', () => {
      const span = '<span class="foo">bar</span>';
      expect(defaultSanitizer.sanitize(span)).to.equal(span);
    });

    it('should set the rel attribute for <a> tags to "nofollow', () => {
      const a = '<a rel="foo" href="bar">Baz</a>';
      const expected = a.replace('foo', 'nofollow');
      expect(defaultSanitizer.sanitize(a)).to.equal(expected);
    });

    it('should allow the class attribute for code tags', () => {
      const code = '<code class="foo">bar</code>';
      expect(defaultSanitizer.sanitize(code)).to.equal(code);
    });

    it('should allow the class attribute for div tags', () => {
      const div = '<div class="foo">bar</div>';
      expect(defaultSanitizer.sanitize(div)).to.equal(div);
    });

    it('should allow the class attribute for p tags', () => {
      const p = '<p class="foo">bar</p>';
      expect(defaultSanitizer.sanitize(p)).to.equal(p);
    });

    it('should allow the class attribute for pre tags', () => {
      const pre = '<pre class="foo">bar</pre>';
      expect(defaultSanitizer.sanitize(pre)).to.equal(pre);
    });

    it('should strip script tags', () => {
      const script = '<script>alert("foo")</script>';
      expect(defaultSanitizer.sanitize(script)).to.equal('');
    });

    it('should strip iframe tags', () => {
      const script = '<iframe src=""></iframe>';
      expect(defaultSanitizer.sanitize(script)).to.equal('');
    });

    it('should strip link tags', () => {
      const link = '<link rel="stylesheet" type="text/css" href="theme.css">';
      expect(defaultSanitizer.sanitize(link)).to.equal('');
    });

    it('should pass through simple well-formed whitelisted markup', () => {
      const div = '<div><p>Hello <b>there</b></p></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal(div);
    });

    it('should allow video tags with some attributes', () => {
      const video =
        '<video src="my/video.mp4" height="42" width="42"' +
        ' autoplay controls loop muted></video>';
      expect(defaultSanitizer.sanitize(video)).to.equal(video);
    });

    it('should allow audio tags with some attributes', () => {
      const audio =
        '<audio src="my/audio.ogg autoplay loop ' + 'controls muted"></audio>';
      expect(defaultSanitizer.sanitize(audio)).to.equal(audio);
    });

    it('should allow input tags but disable them', () => {
      const html = defaultSanitizer.sanitize(
        '<input type="checkbox" checked />'
      );
      const div = document.createElement('div');
      let input: HTMLInputElement;

      div.innerHTML = html;
      input = div.querySelector('input')!;

      expect(input.disabled).to.equal(true);
    });

    // Test unwanted inline CSS style stripping

    it('should allow harmless inline CSS', () => {
      const div = '<div style="color:green"></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal(div);
    });

    it("should strip 'content' properties from inline CSS", () => {
      const div = '<div style="color: green; content: attr(title)"></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal(
        '<div style="color:green"></div>'
      );
    });

    it("should strip 'counter-increment' properties from inline CSS", () => {
      const div = '<div style="counter-increment: example-counter;"></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal('<div></div>');
    });

    it("should strip 'counter-reset' properties from inline CSS", () => {
      const div = '<div style="counter-reset: chapter-count 0;"></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal('<div></div>');
    });

    it("should strip 'widows' properties from inline CSS", () => {
      const div = '<div style="widows: 2;"></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal('<div></div>');
    });

    it("should strip 'orphans' properties from inline CSS", () => {
      const div = '<div style="orphans: 3;"></div>';
      expect(defaultSanitizer.sanitize(div)).to.equal('<div></div>');
    });
  });
});
