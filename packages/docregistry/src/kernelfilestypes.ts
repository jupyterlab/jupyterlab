import { ReadonlyJSONObject } from '@lumino/coreutils';
import { KernelSpec } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';

export interface IFileTypeData extends ReadonlyJSONObject {
  fileExt: string;
  iconName: string;
  launcherLabel: string;
  paletteLabel: string;
  caption: string;
}

/**
 * Use available kernels to determine which common file types should have 'Create New'
 * options in the Launcher, File Editor palette, File menu, FileBrowser etc..
 */
export async function getAvailableKernelFileTypes(
  specsManager: KernelSpec.IManager,
  translator: ITranslator
): Promise<Set<IFileTypeData>> {
  const trans = translator.load('jupyterlab');

  const commonLanguageFileTypeData = new Map<string, IFileTypeData[]>([
    [
      'python',
      [
        {
          fileExt: 'py',
          iconName: 'ui-components:python',
          launcherLabel: trans.__('Python File'),
          paletteLabel: trans.__('New Python File'),
          caption: trans.__('Create a new Python file')
        }
      ]
    ],
    [
      'julia',
      [
        {
          fileExt: 'jl',
          iconName: 'ui-components:julia',
          launcherLabel: trans.__('Julia File'),
          paletteLabel: trans.__('New Julia File'),
          caption: trans.__('Create a new Julia file')
        }
      ]
    ],
    [
      'R',
      [
        {
          fileExt: 'r',
          iconName: 'ui-components:r-kernel',
          launcherLabel: trans.__('R File'),
          paletteLabel: trans.__('New R File'),
          caption: trans.__('Create a new R file')
        }
      ]
    ]
  ]);

  await specsManager.ready;
  let fileTypes = new Set<IFileTypeData>();
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
