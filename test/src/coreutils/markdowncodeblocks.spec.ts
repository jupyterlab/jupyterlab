// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  MarkdownCodeBlocks
} from '@jupyterlab/coreutils';


describe('@jupyterlab/coreutils', () => {

  describe('MarkdownCodeBlocks', () => {

    describe('.isMarkdown()', () => {
      it('should return true for a valid markdown extension', () => {
        let isMarkdown = MarkdownCodeBlocks.isMarkdown(".md");
        expect(isMarkdown).true
      });

    });

    function performTest(text: string, startLine: number, endLine: number) {
      for (let marker of MarkdownCodeBlocks.markdownMarkers) {
        let markdown1 = marker + text + marker;
        let cb = MarkdownCodeBlocks.findMarkdownCodeBlocks(markdown1)[0];
        expect(cb.code).to.equal(text);
        expect(cb.startLine).to.equal(startLine);
        expect(cb.endLine).to.equal(endLine);
      }
    }

    describe('.findMarkdownCodeBlocks()', () => {
      it('should return the codeblock for all delimiters', () => {
        performTest("print(\"foobar\");\nprint(\"blahblah\")", 0, 1);
      });

      it('should return all codeblocks for multiline text', () => {
        let text = `print("foo");
        import os;
        print("helloworld!")`;
        performTest(text, 0, 2);
      });

      it('should return all codeblocks for text containing multiple delimiters', () => {
        let text = `
          pop goes the weasel!
          \`print("amazing!");\`
          \`
          print("amazing!");
          \`
          \`print("amazing!");
          \`
          \`
          print("amazing!");\`
          
          \`\`\`print("with triple quotes");\`\`\`
          \`\`\`print("with triple quotes");
          print("and multiline");
          \`\`\`
          \`\`\`
          print("with triple quotes");
          \`\`\`
          \`\`\`
          print("with triple quotes");\`\`\`

          wheels on the bus go round and round!

          ~~~~print("how about this?");~~~~
          ~~~~
          print("how about this?");
          ~~~~
          ~~~~
          print("how about this?");~~~~
          ~~~~print("how about this?");
          ~~~~
        `;

        let codeblocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(text);
        expect(codeblocks.length).to.equal(12);
        expect(codeblocks[0].code, 'cb0').to.equal('print("amazing!");')
        expect(codeblocks[1].code, 'cb1').to.equal('\n          print("amazing!");\n          ')
        expect(codeblocks[2].code, 'cb2').to.equal('print("amazing!");\n          ')
        expect(codeblocks[3].code, 'cb3').to.equal('\n          print("amazing!");')

        expect(codeblocks[4].code, 'cb4').to.equal('print("with triple quotes");')
        expect(codeblocks[5].code, 'cb5').to.equal('print("with triple quotes");\n          print("and multiline");\n          ');
        expect(codeblocks[6].code, 'cb6').to.equal('\n          print("with triple quotes");\n          ')
        expect(codeblocks[7].code, 'cb7').to.equal('\n          print("with triple quotes");')

        expect(codeblocks[8].code, 'cb8').to.equal('print("how about this?");')
        expect(codeblocks[9].code, 'cb9').to.equal('\n          print("how about this?");\n          ')
        expect(codeblocks[10].code, 'cb10').to.equal('\n          print("how about this?");')
        expect(codeblocks[11].code, 'cb11').to.equal('print("how about this?");\n          ')

      });
    });

  });

});
