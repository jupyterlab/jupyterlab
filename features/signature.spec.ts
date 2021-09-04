import { expect } from 'chai';

import { BrowserConsole } from '../virtual/console';

import { signatureToMarkdown } from './signature';

describe('Signature', () => {
  describe('SignatureToMarkdown', () => {
    const MockHighlighter = (code: string, fragment: string) =>
      code.replace(fragment, `<u>${fragment}</u>`);

    it('renders plaintext signature', async () => {
      let text = signatureToMarkdown(
        {
          label: 'str(text)',
          documentation: 'Create a new *string* object from the given object.',
          parameters: [
            {
              label: 'text',
              documentation: null
            }
          ],
          activeParameter: 0
        },
        'python',
        MockHighlighter,
        new BrowserConsole()
      );
      expect(text).to.be.equal(
        'str(<u>text</u>)\nCreate a new \\*string\\* object from the given object.\n'
      );
    });

    it('renders plaintext signature with MarkupContent documentation', async () => {
      let text = signatureToMarkdown(
        {
          label: 'str(text)',
          documentation: {
            value: 'Create a new *string* object from the given object.',
            kind: 'plaintext'
          },
          parameters: [
            {
              label: 'text',
              documentation: null
            }
          ],
          activeParameter: 0
        },
        'python',
        MockHighlighter,
        new BrowserConsole()
      );
      expect(text).to.be.equal(
        'str(<u>text</u>)\nCreate a new \\*string\\* object from the given object.\n'
      );
    });

    it('renders Markdown signature', async () => {
      let text = signatureToMarkdown(
        {
          label: 'str(text)',
          documentation: {
            value: 'Create a new *string* object from the given object.',
            kind: 'markdown'
          },
          parameters: [
            {
              label: 'text',
              documentation: null
            }
          ],
          activeParameter: 0
        },
        'python',
        MockHighlighter,
        new BrowserConsole()
      );
      expect(text).to.be.equal(
        'str(<u>text</u>)\nCreate a new *string* object from the given object.'
      );
    });
  });
});
