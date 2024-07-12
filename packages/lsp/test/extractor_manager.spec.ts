/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  CodeExtractorsManager,
  IForeignCodeExtractor,
  TextForeignCodeExtractor
} from '@jupyterlab/lsp';

describe('@jupyterlab/lsp', () => {
  describe('CodeExtractorsManager', () => {
    let manager: CodeExtractorsManager;
    let extractor: IForeignCodeExtractor;
    beforeEach(() => {
      manager = new CodeExtractorsManager();
      extractor = new TextForeignCodeExtractor({
        language: 'markdown',
        isStandalone: false,
        file_extension: 'md',
        cellType: ['markdown']
      });
    });
    describe('#register', () => {
      it('should register the extractor for all language', () => {
        manager.register(extractor, null);
        expect(manager['_extractorMapAnyLanguage'].get('markdown')).toContain(
          extractor
        );
      });
      it('should register the extractor for specified language', () => {
        manager.register(extractor, 'python');
        expect(
          manager['_extractorMap'].get('markdown').get('python')
        ).toContain(extractor);
      });
    });
    describe('#getExtractors', () => {
      it('should get the extractor for all language', () => {
        manager.register(extractor, null);
        expect(manager.getExtractors('markdown', null)).toContain(extractor);
      });
      it('should get the extractor for specified language', () => {
        manager.register(extractor, 'python');
        expect(manager.getExtractors('markdown', 'python')).toContain(
          extractor
        );
      });
    });
  });
});
