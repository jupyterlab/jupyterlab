import { CodeEditor } from '@jupyterlab/codeeditor';
import { expect } from 'chai';

import { IVirtualDocumentBlock, VirtualDocument } from '../virtual/document';

export function extract_code(document: VirtualDocument, code: string) {
  return document.extract_foreign_code(
    { value: code, ce_editor: null },
    {
      line: 0,
      column: 0
    }
  );
}

interface IDocumentWithRange {
  range: CodeEditor.IRange;
  virtual_document: VirtualDocument;
}

export function get_the_only_pair(
  foreign_document_map: Map<CodeEditor.IRange, IVirtualDocumentBlock>
): IDocumentWithRange {
  expect(foreign_document_map.size).to.equal(1);

  let range = foreign_document_map.keys().next().value;
  let { virtual_document } = foreign_document_map.get(range);

  return { range, virtual_document };
}

export function get_the_only_virtual(
  foreign_document_map: Map<CodeEditor.IRange, IVirtualDocumentBlock>
) {
  let { virtual_document } = get_the_only_pair(foreign_document_map);
  return virtual_document;
}

export function wrap_in_python_lines(line: string) {
  return 'print("some code before")\n' + line + '\n' + 'print("and after")\n';
}
