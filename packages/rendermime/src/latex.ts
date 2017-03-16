// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Some magic for deferring mathematical expressions to MathJax
// by hiding them from the Markdown parser.
// Some of the code here is adapted with permission from Davide Cervone
// under the terms of the Apache2 license governing the MathJax project.
// Other minor modifications are also due to StackExchange and are used with
// permission.

const inline = '$'; // the inline math delimiter

// MATHSPLIT contains the pattern for math delimiters and special symbols
// needed for searching for math in the text input.
const MATHSPLIT = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[{}$]|[{}]|(?:\n\s*)+|@@\d+@@|\\\\(?:\(|\)|\[|\]))/i;

// A module-level initialization flag.
let initialized = false;


// Stub for window MathJax.
declare var MathJax: any;

/**
 *  Break up the text into its component parts and search
 *    through them for math delimiters, braces, linebreaks, etc.
 *  Math delimiters must match and braces must balance.
 *  Don't allow math to pass through a double linebreak
 *    (which will be a paragraph).
 */
export
function removeMath(text: string): { text: string, math: string[] } {
  let math: string[] = []; // stores math strings for later
  let start: number;
  let end: string;
  let last: number;
  let braces: number;
  let deTilde: (text: string) => string;

  if (!initialized) {
    init();
    initialized = true;
  }

  // Except for extreme edge cases, this should catch precisely those pieces of the markdown
  // source that will later be turned into code spans. While MathJax will not TeXify code spans,
  // we still have to consider them at this point; the following issue has happened several times:
  //
  //     `$foo` and `$bar` are variables.  -->  <code>$foo ` and `$bar</code> are variables.
  let hasCodeSpans = /`/.test(text);
  if (hasCodeSpans) {
    text = text.replace(/~/g, '~T').replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, (wholematch) => wholematch.replace(/\$/g, '~D'));
    deTilde = (text: string) => {
      return text.replace(/~([TD])/g,
        (wholematch, character) => (character === 'T') ? '~' : inline);
    };
  } else {
    deTilde = (text: string) => { return text; };
  }

  let blocks = text.replace(/\r\n?/g, '\n').split(MATHSPLIT);

  for (let i = 1, m = blocks.length; i < m; i += 2) {
    let block = blocks[i];
    if (block.charAt(0) === '@') {
      //
      //  Things that look like our math markers will get
      //  stored and then retrieved along with the math.
      //
      blocks[i] = '@@' + math.length + '@@';
      math.push(block);
    } else if (start) {
      //
      //  If we are in math, look for the end delimiter,
      //    but don't go past double line breaks, and
      //    and balance braces within the math.
      //
      if (block === end) {
        if (braces) {
          last = i;
        } else {
          blocks = processMath(start, i, deTilde, math, blocks);
          start  = null;
          end    = null;
          last   = null;
        }
      } else if (block.match(/\n.*\n/)) {
        if (last) {
          i = last;
          blocks = processMath(start, i, deTilde, math, blocks);
        }
        start = null;
        end = null;
        last = null;
        braces = 0;
      } else if (block === '{') {
        braces++;
      } else if (block === '}' && braces) {
        braces--;
      }
    } else {
      //
      //  Look for math start delimiters and when
      //    found, set up the end delimiter.
      //
      if (block === inline || block === '$$') {
        start = i;
        end = block;
        braces = 0;
      } else if (block === '\\\\\(' || block === '\\\\\[') {
        start = i;
        end = block.slice(-1) === '(' ? '\\\\\)' : '\\\\\]';
        braces = 0;
      } else if (block.substr(1, 5) === 'begin') {
        start = i;
        end = '\\end' + block.substr(6);
        braces = 0;
      }
    }
  }
  if (last) {
    blocks = processMath(start, last, deTilde, math, blocks);
    start = null;
    end = null;
    last = null;
  }
  return { text: deTilde(blocks.join('')), math };
};


/**
 * Put back the math strings that were saved,
 * and clear the math array (no need to keep it around).
 */
export
function replaceMath(text: string, math: string[]): string {
  /**
   * Replace a math placeholder with its corresponding group.
   * The math delimiters "\\(", "\\[", "\\)" and "\\]" are replaced
   * removing one backslash in order to be interpreted correctly by MathJax.
   */
  let process = (match: string, n: number): string => {
    let group = math[n];
    if (group.substr(0, 3) === "\\\\\(" &&
        group.substr(group.length - 3) === "\\\\\)") {
      group = "\\\(" + group.substring(3, group.length - 3) + "\\\)";
    } else if (group.substr(0, 3) === "\\\\\[" &&
               group.substr(group.length - 3) === "\\\\\]") {
      group = "\\\[" + group.substring(3, group.length - 3) + "\\\]";
    }
    return group;
  };
  // Replace all the math group placeholders in the text
  // with the saved strings.
  return text.replace(/@@(\d+)@@/g, process);
};


/**
 * Typeset the math in a node.
 */
export
function typeset(node: HTMLElement): void {
  if (!initialized) {
    init();
    initialized = true;
  }
  if ((window as any).MathJax) {
    MathJax.Hub.Queue(['Typeset', MathJax.Hub, node]);
  }
}


/**
 * Initialize latex handling.
 */
function init() {
  if (!(window as any).MathJax) {
    return;
  }
  MathJax.Hub.Config({
    tex2jax: {
      inlineMath: [ ['$', '$'], ['\\(', '\\)'] ],
      displayMath: [ ['$$', '$$'], ['\\[', '\\]'] ],
      processEscapes: true,
      processEnvironments: true
    },
    // Center justify equations in code and markdown cells. Elsewhere
    // we use CSS to left justify single line equations in code cells.
    displayAlign: 'center',
    CommonHTML: {
       linebreaks: { automatic: true }
     },
    'HTML-CSS': {
        availableFonts: [],
        imageFont: null,
        preferredFont: null,
        webFont: 'STIX-Web',
        styles: {'.MathJax_Display': {'margin': 0}},
        linebreaks: { automatic: true }
    },
  });
  MathJax.Hub.Configured();
}


/**
 * Process math blocks.
 *
 * The math is in blocks i through j, so
 *   collect it into one block and clear the others.
 *  Replace &, <, and > by named entities.
 *  For IE, put <br> at the ends of comments since IE removes \n.
 *  Clear the current math positions and store the index of the
 *   math, then push the math string onto the storage array.
 *  The preProcess function is called on all blocks if it has been passed in
 */
function processMath(i: number, j: number, preProcess: (input: string) => string, math: string[], blocks: string[]): string[] {
  let block = blocks.slice(i, j + 1).join('').replace(/&/g, '&amp;') // use HTML entity for &
  .replace(/</g, '&lt;') // use HTML entity for <
  .replace(/>/g, '&gt;') // use HTML entity for >
  ;
  if (navigator && navigator.appName === 'Microsoft Internet Explorer') {
    block = block.replace(/(%[^\n]*)\n/g, '$1<br/>\n');
  }
  while (j > i) {
    blocks[j] = '';
    j--;
  }
  blocks[i] = '@@' + math.length + '@@'; // replace the current block text with a unique tag to find later
  if (preProcess) {
    block = preProcess(block);
  }
  math.push(block);
  return blocks;
};
