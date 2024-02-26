// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeMirrorMimeTypeService,
  EditorLanguageRegistry
} from '@jupyterlab/codemirror';

import { foo } from './foolanguage';

describe('@jupyterlab/codemirror', () => {
  describe('CodeMirrorMimeTypeService', () => {
    let languages: EditorLanguageRegistry;
    let mimetypeService: CodeMirrorMimeTypeService;

    beforeEach(() => {
      languages = new EditorLanguageRegistry();
      languages.addLanguage({
        name: 'foo',
        mime: 'text/foo',
        load: () => Promise.resolve(foo())
      });
      mimetypeService = new CodeMirrorMimeTypeService(languages);
    });

    describe('#getMimeTypeByLanguage', () => {
      it('should get a single MIME type for foo language', () => {
        const mime = mimetypeService.getMimeTypeByLanguage({ name: 'foo' });
        expect(mime).toBe('text/foo');
      });

      it('should return first applicable MIME type', async () => {
        languages.addLanguage({
          name: 'javascript',
          mime: ['text/javascript', 'application/javascript'],
          load: () => Promise.resolve(foo())
        });
        const mime = mimetypeService.getMimeTypeByLanguage({
          name: 'javascript'
        });
        expect(mime).toBe('text/javascript');
      });

      it('should return a text/plain for unknown language', async () => {
        const mime = mimetypeService.getMimeTypeByLanguage({ name: 'bar' });
        expect(mime).toBe('text/plain');
      });

      it('should return a text/plain for language with empty array of MIME types', async () => {
        languages.addLanguage({
          name: 'bar',
          mime: [],
          load: () => Promise.resolve(foo())
        });
        const mime = mimetypeService.getMimeTypeByLanguage({ name: 'bar' });
        expect(mime).toBe('text/plain');
      });
    });
  });
});
