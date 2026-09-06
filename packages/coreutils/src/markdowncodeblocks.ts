// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The namespace for code block functions which help
 * in extract code from markdown text
 */
export namespace MarkdownCodeBlocks {
  export const CODE_BLOCK_MARKER = '```';
  const markdownExtensions: string[] = [
    '.markdown',
    '.mdown',
    '.mkdn',
    '.md',
    '.mkd',
    '.mdwn',
    '.mdtxt',
    '.mdtext',
    '.text',
    '.txt',
    '.Rmd'
  ];

  export class MarkdownCodeBlock {
    startLine: number;
    endLine: number;
    code: string;
    constructor(startLine: number) {
      this.startLine = startLine;
      this.code = '';
      this.endLine = -1;
    }
  }

  /**
   * Check whether the given file extension is a markdown extension
   * @param extension - A file extension
   *
   * @returns true/false depending on whether this is a supported markdown extension
   */
  export function isMarkdown(extension: string): boolean {
    return markdownExtensions.indexOf(extension) > -1;
  }

  /**
   * Construct all code snippets from current text
   * (this could be potentially optimized if we can cache and detect differences)
   * @param text - A string to parse codeblocks from
   *
   * @returns An array of MarkdownCodeBlocks.
   */
  export function findMarkdownCodeBlocks(text: string): MarkdownCodeBlock[] {
    if (!text || text === '') {
      return [];
    }

    const lines = text.split('\n');
    const codeBlocks: MarkdownCodeBlock[] = [];
    let currentBlock = null;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineContainsMarker = line.indexOf(CODE_BLOCK_MARKER) === 0;
      const constructingBlock = currentBlock != null;
      // Skip this line if it is not part of any code block and doesn't contain a marker.
      if (!lineContainsMarker && !constructingBlock) {
        continue;
      }

      // Check if we are already constructing a code block.
      if (!constructingBlock) {
        // Start constructing a new code block.
        currentBlock = new MarkdownCodeBlock(lineIndex);

        // Check whether this is a single line code block of the form ```a = 10```.
        const firstIndex = line.indexOf(CODE_BLOCK_MARKER);
        const lastIndex = line.lastIndexOf(CODE_BLOCK_MARKER);
        const isSingleLine = firstIndex !== lastIndex;
        if (isSingleLine) {
          currentBlock.code = line.substring(
            firstIndex + CODE_BLOCK_MARKER.length,
            lastIndex
          );
          currentBlock.endLine = lineIndex;
          codeBlocks.push(currentBlock);
          currentBlock = null;
        }
      } else if (currentBlock) {
        if (lineContainsMarker) {
          // End of block, finish it up.
          currentBlock.endLine = lineIndex - 1;
          codeBlocks.push(currentBlock);
          currentBlock = null;
        } else {
          // Append the current line.
          currentBlock.code += line + '\n';
        }
      }
    }
    return codeBlocks;
  }
}
