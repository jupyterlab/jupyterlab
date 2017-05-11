// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The namespace for code block functions which help
 * in extract code from markdown text
 */
export
namespace MarkdownCodeBlocks {
  export
  const markdownMarkers: string[] = ["```", "~~~~", "`"]
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

  export
  class MarkdownCodeBlock {
    startLine: number;
    endLine: number;
    code: string;
    constructor(startLine: number) {
      this.startLine = startLine;
      this.code = "";
      this.endLine = -1;
    }
  }

  /**
  * Check whether the given file extension is a markdown extension
  * @param extension - A file extension
  *
  * @returns true/false depending on whether this is a supported markdown extension
  */
  export
  function isMarkdown(extension: string): boolean {
    return markdownExtensions.indexOf(extension) > -1
  }

  /**
  * Construct all code snippets from current text
  * (this could be potentially optimized if we can cache and detect differences)
  * @param text - A string to parse codeblocks from
  *
  * @returns An array of MarkdownCodeBlocks.
  */
  export
  function findMarkdownCodeBlocks(text: string): MarkdownCodeBlock[] {
    if (!text || text == '') {
      return [];
    }

    const lines = text.split("\n");
    const codeSnippets: MarkdownCodeBlock[] = [];
    var currentCode = null;
    for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const marker = findNextMarker(line);
      const lineContainsMarker = marker != '';
      const constructingSnippet = currentCode != null;
      //skip this line if it is not part of any code snippet and doesn't contain a marker
      if (!lineContainsMarker && !constructingSnippet) {
        continue;
      }

      //check if we are already constructing a code snippet
      if (!constructingSnippet) {
        //start constructing
        currentCode = new MarkdownCodeBlock(lineIndex);

        //check whether this is a single line code snippet
        const firstIndex = line.indexOf(marker);
        const lastIndex = line.lastIndexOf(marker);
        const isSingleLine = firstIndex != lastIndex
        if (isSingleLine) {
          currentCode.code = line.substring(firstIndex + marker.length, lastIndex);
          currentCode.endLine = lineIndex;
          codeSnippets.push(currentCode);
          currentCode = null;
        } else {
          currentCode.code = line.substring(firstIndex + marker.length);
        }
      } else {
        //already constructing
        if (lineContainsMarker) {
          currentCode.code += "\n" + line.substring(0, line.indexOf(marker));
          currentCode.endLine = lineIndex;
          codeSnippets.push(currentCode);
          currentCode = null;
        } else {
          currentCode.code += "\n" + line;
        }
      }
    }
    return codeSnippets;
  }


  function findNextMarker(text: string) {
    for (let marker of markdownMarkers) {
      const index = text.indexOf(marker);
      if (index > -1) {
        return marker;
      }
    }
    return '';
  }
}
