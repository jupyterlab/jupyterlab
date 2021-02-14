import { get_breadcrumbs } from './utils';
import { VirtualDocument } from '../virtual/document';
import { WidgetAdapter } from '../adapters/adapter';
import { IDocumentWidget } from '@jupyterlab/docregistry';

function create_dummy_document(options: Partial<VirtualDocument.IOptions>) {
  return new VirtualDocument({
    language: 'python',
    foreign_code_extractors: {},
    overrides_registry: {},
    path: 'Untitled.ipynb.py',
    file_extension: 'py',
    has_lsp_supported_file: false,
    ...options
  });
}

describe('get_breadcrumbs', () => {
  it('should collapse long paths', () => {
    let document = create_dummy_document({
      path: 'dir1/dir2/Test.ipynb'
    });
    let breadcrumbs = get_breadcrumbs(document, {
      has_multiple_editors: false
    } as WidgetAdapter<IDocumentWidget>);
    expect(breadcrumbs[0].props['title']).toBe('dir1/dir2/Test.ipynb');
    expect(breadcrumbs[0].props['children']).toBe('dir1/.../Test.ipynb');
  });

  it('should trim the extra filename suffix for files created out of notebooks', () => {
    let document = create_dummy_document({
      path: 'Test.ipynb.py',
      file_extension: 'py',
      has_lsp_supported_file: false
    });
    let breadcrumbs = get_breadcrumbs(document, {
      has_multiple_editors: false
    } as WidgetAdapter<IDocumentWidget>);
    expect(breadcrumbs[0].props['children']).toBe('Test.ipynb');
  });

  it('should not trim the filename suffix for standalone files', () => {
    let document = create_dummy_document({
      path: 'test.py',
      file_extension: 'py',
      has_lsp_supported_file: true
    });
    let breadcrumbs = get_breadcrumbs(document, {
      has_multiple_editors: false
    } as WidgetAdapter<IDocumentWidget>);
    expect(breadcrumbs[0].props['children']).toBe('test.py');
  });
});
