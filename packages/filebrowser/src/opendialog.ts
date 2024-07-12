// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, setToolbar, ToolbarButton } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Contents } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IScore, newFolderIcon, refreshIcon } from '@jupyterlab/ui-components';
import { PanelLayout, Widget } from '@lumino/widgets';
import { FileBrowser } from './browser';
import { FilterFileBrowserModel } from './model';
import { IFileBrowserFactory } from './tokens';
import { PromiseDelegate } from '@lumino/coreutils';

/**
 * The class name added to open file dialog
 */
const OPEN_DIALOG_CLASS = 'jp-Open-Dialog';

/**
 * The class name added to (optional) label in the file dialog
 */
const OPEN_DIALOG_LABEL_CLASS = 'jp-Open-Dialog-label';

/**
 * Namespace for file dialog
 */
export namespace FileDialog {
  /**
   * Options for the open directory dialog
   */
  export interface IDirectoryOptions
    extends Partial<
      Pick<
        Dialog.IOptions<Promise<Contents.IModel[]>>,
        Exclude<
          keyof Dialog.IOptions<Promise<Contents.IModel[]>>,
          'body' | 'buttons' | 'defaultButton'
        >
      >
    > {
    /**
     * Document manager
     */
    manager: IDocumentManager;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * Default path to open
     */
    defaultPath?: string;

    /**
     * Text to display above the file browser.
     */
    label?: string;
  }

  /**
   * Options for the open file dialog
   */
  export interface IFileOptions extends IDirectoryOptions {
    /**
     * Filter function on file browser item model
     */
    filter?: (value: Contents.IModel) => Partial<IScore> | null;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Create and show a open files dialog.
   *
   * Note: if nothing is selected when `getValue` will return the browser
   * model current path.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted.
   */
  export async function getOpenFiles(
    options: IFileOptions
  ): Promise<Dialog.IResult<Contents.IModel[]>> {
    const translator = options.translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    const openDialog = new OpenDialog(
      options.manager,
      options.filter,
      translator,
      options.defaultPath,
      options.label
    );
    const dialogOptions: Partial<Dialog.IOptions<Contents.IModel[]>> = {
      title: options.title,
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({
          label: trans.__('Select')
        })
      ],
      focusNodeSelector: options.focusNodeSelector,
      host: options.host,
      renderer: options.renderer,
      body: openDialog
    };

    await openDialog.ready;

    const dialog = new Dialog(dialogOptions);
    return dialog.launch();
  }

  /**
   * Create and show a open directory dialog.
   *
   * Note: if nothing is selected when `getValue` will return the browser
   * model current path.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted.
   */
  export function getExistingDirectory(
    options: IDirectoryOptions
  ): Promise<Dialog.IResult<Contents.IModel[]>> {
    return getOpenFiles({
      ...options,
      filter: model => {
        return model.type === 'directory' ? {} : null;
      }
    });
  }
}

/**
 * Open dialog widget
 */
class OpenDialog
  extends Widget
  implements Dialog.IBodyWidget<Contents.IModel[]>
{
  constructor(
    manager: IDocumentManager,
    filter?: (value: Contents.IModel) => Partial<IScore> | null,
    translator?: ITranslator,
    defaultPath?: string,
    label?: string,
    filterDirectories?: boolean
  ) {
    super();
    translator = translator ?? nullTranslator;
    const trans = translator.load('jupyterlab');
    this.addClass(OPEN_DIALOG_CLASS);

    Private.createFilteredFileBrowser(
      'filtered-file-browser-dialog',
      manager,
      filter,
      {},
      translator,
      defaultPath,
      filterDirectories
    )
      .then(browser => {
        this._browser = browser;

        // Add toolbar items
        setToolbar(this._browser, (browser: FileBrowser) => [
          {
            name: 'new-folder',
            widget: new ToolbarButton({
              icon: newFolderIcon,
              onClick: () => {
                void browser.createNewDirectory();
              },
              tooltip: trans.__('New Folder')
            })
          },
          {
            name: 'refresher',
            widget: new ToolbarButton({
              icon: refreshIcon,
              onClick: () => {
                browser.model.refresh().catch(reason => {
                  console.error(
                    'Failed to refresh file browser in open dialog.',
                    reason
                  );
                });
              },
              tooltip: trans.__('Refresh File List')
            })
          }
        ]);

        // Build the sub widgets
        const layout = new PanelLayout();
        if (label) {
          const labelWidget = new Widget();
          labelWidget.addClass(OPEN_DIALOG_LABEL_CLASS);
          labelWidget.node.textContent = label;
          layout.addWidget(labelWidget);
        }
        layout.addWidget(this._browser);

        /**
         * Dispose browser model when OpenDialog
         * is disposed.
         */
        this.dispose = () => {
          if (this.isDisposed) {
            return;
          }
          this._browser.model.dispose();
          super.dispose();
        };

        // Set Widget content
        this.layout = layout;

        this._ready.resolve();
      })
      .catch(reason => {
        console.error(
          'Error while creating file browser in open dialog',
          reason
        );
        this._ready.reject(void 0);
      });
  }

  /**
   * Get the selected items.
   */
  getValue(): Contents.IModel[] {
    const selection = Array.from(this._browser.selectedItems());
    if (selection.length === 0) {
      // Return current path
      return [
        {
          path: this._browser.model.path,
          name: PathExt.basename(this._browser.model.path),
          type: 'directory',
          content: undefined,
          writable: false,
          created: 'unknown',
          last_modified: 'unknown',
          mimetype: 'text/plain',
          format: 'text'
        }
      ];
    } else {
      return selection;
    }
  }

  /**
   * A promise that resolves when openDialog is successfully created.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  private _ready: PromiseDelegate<void> = new PromiseDelegate<void>();
  private _browser: FileBrowser;
}

namespace Private {
  /**
   * Create a new file browser instance.
   *
   * @param id - The widget/DOM id of the file browser.
   *
   * @param manager - A document manager instance.
   *
   * @param filter - function to filter file browser item.
   *
   * @param options - The optional file browser configuration object.
   *
   * #### Notes
   * The ID parameter is used to set the widget ID. It is also used as part of
   * the unique key necessary to store the file browser's restoration data in
   * the state database if that functionality is enabled.
   *
   * If, after the file browser has been generated by the factory, the ID of the
   * resulting widget is changed by client code, the restoration functionality
   * will not be disrupted as long as there are no ID collisions, i.e., as long
   * as the initial ID passed into the factory is used for only one file browser
   * instance.
   */
  export const createFilteredFileBrowser = async (
    id: string,
    manager: IDocumentManager,
    filter?: (value: Contents.IModel) => Partial<IScore> | null,
    options: IFileBrowserFactory.IOptions = {},
    translator?: ITranslator,
    defaultPath?: string,
    filterDirectories?: boolean
  ): Promise<FileBrowser> => {
    translator = translator || nullTranslator;
    const model = new FilterFileBrowserModel({
      manager,
      filter,
      translator,
      driveName: options.driveName,
      refreshInterval: options.refreshInterval,
      filterDirectories
    });

    const widget = new FileBrowser({
      id,
      model,
      translator
    });

    if (defaultPath) {
      await widget.model.cd(defaultPath);
    }

    return widget;
  };
}
