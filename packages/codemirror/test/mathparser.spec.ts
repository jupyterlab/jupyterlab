/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// This test utils are modified from the ones in @lezer/markdown licensed under MIT License
// Copyright (C) 2020 by Marijn Haverbeke <marijnh@gmail.com> and others

import { parseMathIPython } from '@jupyterlab/codemirror';
import { Tree, TreeFragment } from '@lezer/common';
import type { MarkdownParser } from '@lezer/markdown';
import { parser } from '@lezer/markdown';
import { StreamLanguage } from '@codemirror/language';
import { stexMath } from '@codemirror/legacy-modes/mode/stex';

const ipythonParser = parser.configure([parseMathIPython()]);
const mixedParser = parser.configure([
  parseMathIPython(StreamLanguage.define(stexMath).parser)
]);

function compareTree(a: Tree, b: Tree) {
  let curA = a.cursor(),
    curB = b.cursor();
  for (;;) {
    let mismatch: string | null = null,
      next = false;
    if (curA.type != curB.type)
      mismatch = `Node type mismatch (${curA.name} vs ${curB.name})`;
    else if (curA.from != curB.from)
      mismatch = `Start pos mismatch for ${curA.name}: ${curA.from} vs ${curB.from}`;
    else if (curA.to != curB.to)
      mismatch = `End pos mismatch for ${curA.name}: ${curA.to} vs ${curB.to}`;
    else if ((next = curA.next()) != curB.next())
      mismatch = `Tree size mismatch`;
    if (mismatch) throw new Error(`${mismatch}\n  ${a}\n  ${b}`);
    if (!next) break;
  }
}

const abbrev: { [abbr: string]: string } = {
  __proto__: null as any,
  CB: 'CodeBlock',
  FC: 'FencedCode',
  Q: 'Blockquote',
  HR: 'HorizontalRule',
  BL: 'BulletList',
  OL: 'OrderedList',
  LI: 'ListItem',
  H1: 'ATXHeading1',
  H2: 'ATXHeading2',
  H3: 'ATXHeading3',
  H4: 'ATXHeading4',
  H5: 'ATXHeading5',
  H6: 'ATXHeading6',
  SH1: 'SetextHeading1',
  SH2: 'SetextHeading2',
  HB: 'HTMLBlock',
  PI: 'ProcessingInstructionBlock',
  CMB: 'CommentBlock',
  LR: 'LinkReference',
  P: 'Paragraph',
  Esc: 'Escape',
  Ent: 'Entity',
  BR: 'HardBreak',
  Em: 'Emphasis',
  St: 'StrongEmphasis',
  Ln: 'Link',
  Im: 'Image',
  C: 'InlineCode',
  HT: 'HTMLTag',
  CM: 'Comment',
  Pi: 'ProcessingInstruction',
  h: 'HeaderMark',
  q: 'QuoteMark',
  l: 'ListMark',
  L: 'LinkMark',
  e: 'EmphasisMark',
  c: 'CodeMark',
  cI: 'CodeInfo',
  cT: 'CodeText',
  LT: 'LinkTitle',
  LL: 'LinkLabel',
  MaID: 'InlineMathDollar',
  maID: 'InlineMathDollarMark',
  MaIB: 'InlineMathBracket',
  maIB: 'InlineMathBracketMark',
  MaBD: 'BlockMathDollar',
  maBD: 'BlockMathDollarMark',
  MaBB: 'BlockMathBracket',
  maBB: 'BlockMathBracketMark'
};

class SpecParser {
  constructor(
    readonly parser: MarkdownParser,
    readonly localAbbrev?: { [name: string]: string }
  ) {}

  type(name: string) {
    name = (this.localAbbrev && this.localAbbrev[name]) || abbrev[name] || name;
    return this.parser.nodeSet.types.find(t => t.name == name)?.id;
  }

  parse(spec: string, specName: string) {
    let doc = '',
      buffer: number[] = [],
      hasOpenedCurlyBrace = 0,
      stack: number[] = [];
    for (let pos = 0; pos < spec.length; pos++) {
      let ch = spec[pos];
      if (ch == '{') {
        let name = /^(\w+):/.exec(spec.slice(pos + 1)),
          tag = name && this.type(name[1]);
        if (tag == null) {
          if (name != null)
            throw new Error(
              `Invalid node opening mark at ${pos} in ${specName}`
            );
          // If no tag found, assume curly brace is part of the document
          hasOpenedCurlyBrace++;
          doc += ch;
          continue;
        }
        pos += name![0].length;
        stack.push(tag, doc.length, buffer.length);
      } else if (ch == '}') {
        if (!stack.length && !hasOpenedCurlyBrace)
          throw new Error(
            `Mismatched node close mark at ${pos} in ${specName}`
          );
        if (hasOpenedCurlyBrace) {
          hasOpenedCurlyBrace--;
          doc += ch;
          continue;
        }
        let bufStart = stack.pop()!,
          from = stack.pop()!,
          type = stack.pop()!;
        buffer.push(type, from, doc.length, 4 + buffer.length - bufStart);
      } else {
        doc += ch;
      }
    }
    if (stack.length) throw new Error(`Unclosed node in ${specName}`);
    return {
      tree: Tree.build({
        buffer,
        nodeSet: this.parser.nodeSet,
        topID: this.type('Document')!,
        length: doc.length
      }),
      doc
    };
  }
}

const specParser = new SpecParser(ipythonParser);

function test(name: string, spec: string) {
  // eslint-disable-next-line jest/expect-expect
  it(name, () => {
    let { tree, doc } = specParser.parse(spec, name);
    // Uncomment the following line if you want to display the test document
    // console.log(doc)
    compareTree(ipythonParser.parse(doc), tree);
  });
}

/*
  The test utils will reconstitue the document by removing
  the tree node spec. Then the tree will be compared to the
  parsing of that extracted document.

  As an example, the tree

  `
 {H3:{h:###} foo}
  {H2:{h:##} foo}
   {H1:{h:#} foo}
`

  will produce the document

  `
 ### foo
  ## foo
   # foo
`
 */

// Inline math $

test(
  'Inline math $ with no space',
  `
{P:{MaID:{maID:$}\\vec{F} = m \\vec{a}{maID:$}}}
`
);

test(
  'Inline math $ with space after start',
  `
{P:{MaID:{maID:$} \\vec{F} = m \\vec{a}{maID:$}}}
`
);

test(
  'Inline math $ with space before end',
  `
{P:{MaID:{maID:$}\\vec{F} = m \\vec{a} {maID:$}}}
`
);

test(
  'Inline math $ with spaces',
  `
 {P:{MaID:{maID:$} \\vec{F} = m \\vec{a} {maID:$}} }
`
);

test(
  'Inline math $ on multilines',
  `
{P:{MaID:{maID:$}\\vec{F} =
m \\vec{a}{maID:$}}}
`
);

test(
  'Not math $',
  `
{P:Not a math dollar $}
`
);

test(
  'Money symbol considered as math',
  `
{P:Problematic case: {MaID:{maID:$}20 and {maID:$}}22}
`
);

// Inline math \\( \\)

test(
  'Inline math \\( \\)',
  `
{P:{MaIB:{maIB:\\\\(}\\vec{F} = m \\vec{a}{maIB:\\\\)}}}
`
);

test(
  'Inline math \\( \\) on multilines',
  `
{P:{MaIB:{maIB:\\\\(}\\vec{F} =
m \\vec{a}{maIB:\\\\)}}}
`
);

// Block math $$

test(
  'Block math $$',
  `
{P:{MaBD:{maBD:$$}\\vec{F} = m \\vec{a}{maBD:$$}}}
`
);

test(
  'Block math $$ on multilines',
  `
{MaBD:{maBD:$$}
\\begin{aligned}
\\dot{x} & = \\sigma(y-x) \\\\
\\dot{y} & = \\rho x - y - xz \\\\
\\dot{z} & = -\\beta z + xy
\\end{aligned}
{maBD:$$}}
`
);

test(
  'Block math $$ containing a setext = underline',
  `
{MaBD:{maBD:$$}
\\text{This}
=
\\text{broken.}
{maBD:$$}}
`
);

test(
  'Block math $$ containing a setext - underline',
  `
{MaBD:{maBD:$$}
Title
---
{maBD:$$}}
`
);

test(
  'Block math $$ containing a line starting with a list marker',
  `
{MaBD:{maBD:$$}
L = \\sum_i y_i
- \\lambda w^2
{maBD:$$}}
`
);

test(
  'Block math $$ containing a line starting with a quote marker',
  `
{MaBD:{maBD:$$}
f(x)
> 0
{maBD:$$}}
`
);

test(
  'Block math $$ interrupting a paragraph',
  `
{P:Some text}
{MaBD:{maBD:$$}
a
=
{maBD:$$}}
`
);

test(
  'Block math $$ after a paragraph with $$ in a code span',
  '\n{P:Wrap display math in {C:{c:`}$${c:`}}:}\n{MaBD:{maBD:$$}\nx^2\n{maBD:$$}}\n{P:where {Em:{e:*}x{e:*}} is a variable.}\n'
);

test(
  'Block math $$ followed by Markdown on the closing line',
  `
{MaBD:{maBD:$$}
E = mc^2
{maBD:$$}} {P:where {MaID:{maID:$}m{maID:$}} is the {Em:{e:*}mass{e:*}}.}
`
);

test(
  'Unclosed block math $$ is a paragraph up to a blank line',
  `
{P:$$
a}

{SH1:b
{h:=}}
`
);

test(
  'Closing $$ of math interrupted by a list item is a paragraph',
  `
{P:The loss is $$
L = \\sum_i y_i}
{BL:{LI:{l:+} {P:\\lambda w^2}}}
{P:$$
where {Em:{e:*}w{e:*}} is the weight.}
`
);

test(
  'Block math $$ closing inline math opened in a paragraph',
  `
{P:The energy is {MaBD:{maBD:$$}
E = mc^2
{maBD:$$}}
where {Em:{e:*}m{e:*}} is the mass.}
`
);

// Block math \\[ \\]

test(
  'Block math \\[ \\]',
  `
{P:{MaBB:{maBB:\\\\[}\\vec{F} = m \\vec{a}{maBB:\\\\]}}}
`
);

test(
  'Block math \\[ \\] on multilines',
  `
{P:{MaBB:{maBB:\\\\[}
\\begin{aligned}
\\dot{x} & = \\sigma(y-x) {Esc:\\\\}
\\dot{y} & = \\rho x - y - xz {Esc:\\\\}
\\dot{z} & = -\\beta z + xy
\\end{aligned}
{maBB:\\\\]}}}
`
);

describe('markdown parser', () => {
  it('should parse empty math block $$$$ without error', () => {
    const inputText = '$$$$';
    expect(() => mixedParser.parse(inputText)).not.toThrow();
  });

  it('should reparse a list item ending with $$ math as from scratch', () => {
    // TreeFragment.applyChanges drops unchanged ranges under 128 characters.
    const doc = [
      'The energy of a body at rest follows from its mass, as the list below',
      'shows for a few cases.',
      '',
      '- Energy:',
      '  $$',
      '  E = mc^2',
      '  $$ where $m$ is the *mass*.',
      '1. Next step',
      '',
      'Text'
    ].join('\n');
    const edited = `${doc}x`;
    const fragments = TreeFragment.applyChanges(
      TreeFragment.addTree(ipythonParser.parse(doc)),
      [
        {
          fromA: doc.length,
          toA: doc.length,
          fromB: doc.length,
          toB: edited.length
        }
      ]
    );
    expect(ipythonParser.parse(edited, fragments).toString()).toBe(
      ipythonParser.parse(edited).toString()
    );
  });
});
