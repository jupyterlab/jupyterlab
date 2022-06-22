// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MarkdownCodeBlocks } from '@jupyterlab/coreutils';

const MULTI_LINE_BLOCK =
  'Here is text\n\n```\na = 10\nb = 20\n```\n\nMore text.';
const SINGLE_LINE_BLOCK = 'Here is text\n\n```a = 10```\n\nMore text.';
const MULTI_LINE_BLOCK_WITH_LANGUAGE =
  'Here is text\n\n```python\na = 10\nb = 20\n```\n\nMore text.';

describe('@jupyterlab/coreutils', () => {
  describe('MarkdownCodeBlocks', () => {
    describe('.isMarkdown()', () => {
      it('should return true for a valid markdown extension', () => {
        const isMarkdown = MarkdownCodeBlocks.isMarkdown('.md');
        expect(isMarkdown).toBe(true);
      });
    });

    describe('.findMarkdownCodeBlocks()', () => {
      it('should find a simple block', () => {
        const codeblocks =
          MarkdownCodeBlocks.findMarkdownCodeBlocks(MULTI_LINE_BLOCK);
        expect(codeblocks.length).toBe(1);
        expect(codeblocks[0].code).toBe('a = 10\nb = 20\n');
      });

      it('should find a single line block', () => {
        const codeblocks =
          MarkdownCodeBlocks.findMarkdownCodeBlocks(SINGLE_LINE_BLOCK);
        expect(codeblocks.length).toBe(1);
        expect(codeblocks[0].code).toBe('a = 10');
      });

      it('should find a block with a language', () => {
        const codeblocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(
          MULTI_LINE_BLOCK_WITH_LANGUAGE
        );
        expect(codeblocks.length).toBe(1);
        expect(codeblocks[0].code).toBe('a = 10\nb = 20\n');
      });
    });
  });
});
