/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { KernelSpec } from '@jupyterlab/services';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

/**
 * Use available kernels to determine which common file types should have 'Create New'
 * options in the Launcher, File Editor palette, File menu, FileBrowser etc..
 */
export async function getAvailableKernelFileTypes(
  specsManager: KernelSpec.IManager
): Promise<Set<IRenderMime.IFileType>> {
  const commonLanguageFileTypeData = new Map<string, IRenderMime.IFileType[]>([
    [
      'python',
      [
        {
          name: 'Python',
          extensions: ['.py'],
          icon: 'ui-components:python',
          displayName: 'Python',
          mimeTypes: ['text/plain']
        }
      ]
    ],
    [
      'julia',
      [
        {
          name: 'Julia',
          extensions: ['.jl'],
          icon: 'ui-components:julia',
          displayName: 'Julia',
          mimeTypes: ['text/plain']
        }
      ]
    ],
    [
      'R',
      [
        {
          name: 'R',
          extensions: ['.r'],
          icon: 'ui-components:r-kernel',
          displayName: 'R',
          mimeTypes: ['text/plain']
        }
      ]
    ]
  ]);

  await specsManager.ready;
  let fileTypes = new Set<IRenderMime.IFileType>();
  const specs = specsManager.specs?.kernelspecs ?? {};
  Object.keys(specs).forEach(spec => {
    const specModel = specs[spec];
    if (specModel) {
      const exts = commonLanguageFileTypeData.get(specModel.language);
      exts?.forEach(ext => fileTypes.add(ext));
    }
  });
  return fileTypes;
}
