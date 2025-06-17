// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
const sanitizer = new Sanitizer();

describe('sanitizer', () => {
  describe('#sanitize()', () => {
    it('should preserve links containing user-defined schemes', () => {
      const customSanitizer = new Sanitizer();
      customSanitizer.setAllowedSchemes([
        'http',
        'https',
        'mailto',
        'ftp',
        'tel',
        'zoommtg'
      ]);
      const link = '<a href="zoommtg://meeting_link">Join Meeting</a>';
      // The `rel="nofollow"` attribute is added to all `<a>` tags in _generateOptions()
      const expected =
        '<a href="zoommtg://meeting_link" rel="nofollow">Join Meeting</a>';

      const result = customSanitizer.sanitize(link);
      expect(result).toBe(expected);
    });

    it('should allow img tags with "attachment:" when using custom allowed schemes', () => {
      const customSanitizer = new Sanitizer();
      customSanitizer.setAllowedSchemes(['http', 'https']); // No 'attachment'
      const img = '<img src="attachment:myimage.png" alt="img" />';
      expect(customSanitizer.sanitize(img)).toBe(img);
    });

    it('should allow h1 tags', () => {
      const h1 = '<h1>foo</h1>';
      expect(sanitizer.sanitize(h1)).toBe(h1);
    });

    it('should allow h2 tags', () => {
      const h2 = '<h2>foo</h2>';
      expect(sanitizer.sanitize(h2)).toBe(h2);
    });

    it('should not allow svg tags', () => {
      const svg = '<svg>foo</svg>';
      expect(sanitizer.sanitize(svg)).toBe('foo');
    });

    it('should allow img tags and some attributes', () => {
      const img =
        '<img src="smiley.gif" alt="Smiley face" height="42" width="42" />';
      expect(sanitizer.sanitize(img)).toBe(img);
    });

    it('should allow span tags and class attribute', () => {
      const span = '<span class="foo">bar</span>';
      expect(sanitizer.sanitize(span)).toBe(span);
    });

    it('should set the rel attribute for <a> tags to "nofollow', () => {
      const a = '<a rel="foo" href="bar">Baz</a>';
      const expected = a.replace('foo', 'nofollow');
      expect(sanitizer.sanitize(a)).toBe(expected);
    });

    it('should allow the `data-commandlinker-command` attribute for button tags', () => {
      const button =
        '<button data-commandlinker-command="terminal:create-new" onClick={some evil code}>Create Terminal</button>';
      const expectedButton =
        '<button data-commandlinker-command="terminal:create-new">Create Terminal</button>';
      expect(sanitizer.sanitize(button)).toBe(expectedButton);
    });

    it('should allow the class attribute for code tags', () => {
      const code = '<code class="foo">bar</code>';
      expect(sanitizer.sanitize(code)).toBe(code);
    });

    it('should allow the class attribute for div tags', () => {
      const div = '<div class="foo">bar</div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow the class attribute for p tags', () => {
      const p = '<p class="foo">bar</p>';
      expect(sanitizer.sanitize(p)).toBe(p);
    });

    it('should allow the class attribute for pre tags', () => {
      const pre = '<pre class="foo">bar</pre>';
      expect(sanitizer.sanitize(pre)).toBe(pre);
    });

    it('should strip script tags', () => {
      const script = '<script>alert("foo")</script>';
      expect(sanitizer.sanitize(script)).toBe('');
    });

    it('should strip iframe tags', () => {
      const script = '<iframe src=""></iframe>';
      expect(sanitizer.sanitize(script)).toBe('');
    });

    it('should strip link tags', () => {
      const link = '<link rel="stylesheet" type="text/css" href="theme.css">';
      expect(sanitizer.sanitize(link)).toBe('');
    });

    it('should pass through simple well-formed whitelisted markup', () => {
      const div = '<div><p>Hello <b>there</b></p></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow video tags with some attributes', () => {
      const video =
        '<video src="my/video.mp4" height="42" width="42"' +
        ' autoplay controls loop muted></video>';
      expect(sanitizer.sanitize(video)).toBe(video);
    });

    it('should allow audio tags with some attributes', () => {
      const audio =
        '<audio src="my/audio.ogg autoplay loop ' + 'controls muted"></audio>';
      expect(sanitizer.sanitize(audio)).toBe(audio);
    });

    it('should allow input tags but disable them', () => {
      const html = sanitizer.sanitize('<input type="checkbox" checked />');
      const div = document.createElement('div');
      let input: HTMLInputElement;

      div.innerHTML = html;
      input = div.querySelector('input')!;

      expect(input.disabled).toBe(true);
    });

    // Test unwanted inline CSS style stripping

    it('should allow harmless inline CSS', () => {
      const div = '<div style="color:green"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow abbreviated floats in CSS', () => {
      const div = '<div style="color:rgba(255,0,0,.8)"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow background CSS line-gradient with directional', () => {
      const div =
        '<div style="background:linear-gradient(to left top, blue, red)"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow background CSS line-gradient with angle', () => {
      const div =
        '<div style="background:linear-gradient(0deg, blue, green 40%, red)"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow fully specified background CSS line-gradient', () => {
      const div =
        '<div style="background:linear-gradient(red 0%, orange 10% 30%, yellow 50% 70%, green 90% 100%)"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow simple background CSS radial-gradient', () => {
      const div =
        '<div style="background:radial-gradient(#e66465, #9198e5)"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow fully specified background CSS radial-gradient', () => {
      const div =
        '<div style="background:radial-gradient(ellipse farthest-corner at 90% 90%, red, yellow 10%, #1e90ff 50%, beige)"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('strip incorrect CSS line-gradient', () => {
      const div =
        '<div style="background:linear-gradient(http://example.com)"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it("should strip 'content' properties from inline CSS", () => {
      const div = '<div style="color: green; content: attr(title)"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div style="color:green"></div>');
    });

    it("should strip 'counter-increment' properties from inline CSS", () => {
      const div = '<div style="counter-increment: example-counter;"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it("should strip 'counter-reset' properties from inline CSS", () => {
      const div = '<div style="counter-reset: chapter-count 0;"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it("should strip 'widows' properties from inline CSS", () => {
      const div = '<div style="widows: 2;"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it("should strip 'orphans' properties from inline CSS", () => {
      const div = '<div style="orphans: 3;"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    // Additional Grid tests with complex values
    it('should allow grid-template-rows with complex values', () => {
      const div =
        '<div style="grid-template-rows:[header-top] auto [header-bottom main-top] 1fr [main-bottom]"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-template with named lines', () => {
      const div =
        '<div style="grid-template:[row1-start] 25px [row1-end row2-start] 25px [row2-end]"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-template-rows with minmax and repeat function', () => {
      const div =
        '<div style="grid-template-rows:repeat(2, minmax(100px, auto))"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-template with minmax and repeat function', () => {
      const div =
        '<div style="grid-template:repeat(2, minmax(100px, auto)) / repeat(3, minmax(100px, auto))"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-row with named line positions', () => {
      const div = '<div style="grid-row:header-start / header-end"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow flex-direction with all valid values', () => {
      const values = ['row', 'row-reverse', 'column', 'column-reverse'];
      for (const value of values) {
        const div = `<div style="flex-direction:${value}"></div>`;
        expect(sanitizer.sanitize(div)).toBe(div);
      }
    });

    it('should allow grid-row with named line and span syntax', () => {
      const div = '<div style="grid-row:[header-top] / span 2"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-column with span and named line', () => {
      const div = '<div style="grid-column:span 3 / [main-end]"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-template-rows with multiple named lines per track', () => {
      const div =
        '<div style="grid-template-rows:[header-start] 1fr [header-end main-start] 2fr [main-end footer-start] 1fr [footer-end]"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow grid-row-start with named line', () => {
      const div = '<div style="grid-row-start:[content-top]"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    // Negative test cases
    it('should strip grid-template-rows with JavaScript URL', () => {
      const div = '<div style="grid-template-rows:javascript:alert(1)"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it('should strip grid-template with expression function', () => {
      const div =
        '<div style="grid-template:expression(document.cookie="secret=Access achieved")"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it('should strip flex-direction with invalid value', () => {
      const div = '<div style="flex-direction:invalid-value"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it('should strip flex with potentially dangerous values', () => {
      const div = '<div style="flex:url(evil.com)"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it('should correctly reject malformed named lines', () => {
      const div = '<div style="grid-template-rows:[header-top 1fr"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    // Edge cases and combinations
    it('should allow complex combined grid properties', () => {
      const div = `<div style="display:grid; grid-template-columns:repeat(3, 1fr); grid-template-rows:auto 1fr auto; gap:10px; grid-template-areas:'header header header' 'sidebar main main' 'footer footer footer'"></div>`;
      expect(sanitizer.sanitize(div)).toBe(div.replace(/;\s+/g, ';'));
    });

    it('should allow complex flexbox layout combination', () => {
      const div = `<div style="display:flex; flex-direction:column; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px"></div>`;
      expect(sanitizer.sanitize(div)).toBe(div.replace(/;\s+/g, ';'));
    });

    it('should handle grid-template-areas with unusual but valid syntax', () => {
      const div =
        "<div style=\"grid-template-areas:'.     .      .' '.     MAIN   .' '.     .      .'\"></div>";
      expect(sanitizer.sanitize(div)).toBe(div.replace(/;\s+/g, ';'));
    });

    it('should allow decimal values in grid definitions', () => {
      const div = '<div style="grid-template-columns:0.2fr 0.6fr 0.2fr"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should allow calc expressions in grid and flex properties', () => {
      const div =
        '<div style="grid-template-columns:calc(100% - 50px) 50px"></div>';
      expect(sanitizer.sanitize(div)).toBe(div);
    });

    it('should strip grid properties with HTML entity encoding tricks', () => {
      const div =
        '<div style="grid-template:&#x004A;avascript:alert(1"Access achieved")"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });

    it('should strip grid properties with escaped characters', () => {
      const div =
        '<div style="grid-template:pression(alert("Access achieved"))"></div>';
      expect(sanitizer.sanitize(div)).toBe('<div></div>');
    });
  });
});
