import { Cell, ICellModel } from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { NotebookPanel } from '@jupyterlab/notebook';
import {
  IObservableList,
  IObservableUndoableList,
  ObservableList
} from '@jupyterlab/observables';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  addIcon,
  caretDownEmptyThinIcon,
  caretUpEmptyThinIcon,
  LabIcon,
  markdownIcon,
  runIcon
} from '@jupyterlab/ui-components';
import { each, find } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CellToolbarWidget } from './celltoolbarwidget';
import {
  codeIcon,
  deleteIcon,
  formatIcon,
  lockedTagsIcon,
  unlockedTagsIcon
} from './icon';
import { PositionedButton } from './positionedbutton';
import { TagsModel } from './tagsmodel';
import { ICellMenuItem } from './tokens';
import { ToggleButton } from './toolbarbutton';

const DEFAULT_LEFT_MENU: ICellMenuItem[] = [
  // Originate from @jupyterlab/notebook-extension
  {
    cellType: 'markdown',
    command: 'notebook:change-cell-to-code',
    icon: codeIcon
  },
  {
    cellType: 'code',
    command: 'notebook:change-cell-to-markdown',
    icon: markdownIcon
  },
  // Originate from @ryantam626/jupyterlab_code_formatter
  {
    cellType: 'code',
    command: 'jupyterlab_code_formatter:format',
    icon: formatIcon,
    tooltip: 'Format Cell'
  },
  // Originate from @jupyterlab/notebook-extension
  {
    command: 'notebook:delete-cell',
    icon: deleteIcon
  }
];

const DEFAULT_HELPER_BUTTONS: ICellMenuItem[] = [
  // Originate from @jupyterlab/notebook-extension
  {
    command: 'notebook:run-cell-and-select-next',
    icon: runIcon
  },
  {
    command: 'notebook:move-cell-up',
    icon: caretUpEmptyThinIcon
  },
  {
    command: 'notebook:move-cell-down',
    icon: caretDownEmptyThinIcon
  },
  {
    command: 'notebook:insert-cell-below',
    icon: addIcon
  }
];

/**
 * Widget cell toolbar class
 */
const CELL_BAR_CLASS = 'jp-enh-cell-bar';

/**
 * Watch a notebook, and each time a cell is created add a CellTagsWidget to it.
 */
export class CellToolbarTracker implements IDisposable {
  constructor(
    panel: NotebookPanel,
    commands: CommandRegistry,
    settings: ISettingRegistry.ISettings | null
  ) {
    this._commands = commands;
    this._panel = panel;
    this._settings = settings;

    // Add lock tag button
    this._unlockTagsButton = new ToggleButton({
      className: (): string => 'jp-enh-cell-nb-button',
      enabled: (): boolean =>
        (!this._panel?.context.model.readOnly &&
          this._panel?.context.contentsModel?.writable) ??
        false,
      icon: (state: boolean): LabIcon =>
        state ? lockedTagsIcon : unlockedTagsIcon,
      tooltip: (state: boolean): string =>
        state ? 'Lock tags' : 'Unlock tags',
      onClick: (state: boolean): void => {
        for (const id in this._tagsModels) {
          this._tagsModels[id].unlockedTags = state;
        }
      }
    });

    let insertionPoint = -1;
    find(panel.toolbar.children(), (tbb, index) => {
      insertionPoint = index; // It will be the last index or the cell type input
      return tbb.hasClass('jp-Notebook-toolbarCellType');
    });
    panel.toolbar.insertItem(
      insertionPoint + 1,
      'edit-tags',
      this._unlockTagsButton
    );

    if (this._settings) {
      this._onSettingsChanged();
      this._settings.changed.connect(this._onSettingsChanged, this);
    }

    const cells = this._panel.context.model.cells;
    cells.changed.connect(this.updateConnectedCells, this);

    panel.context.fileChanged.connect(this._onFileChanged, this);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }

    const cells = this._panel?.context.model.cells;
    if (cells) {
      cells.changed.disconnect(this.updateConnectedCells, this);
      each(cells.iter(), model => this._removeToolbar(model));
    }

    this._panel?.context.fileChanged.disconnect(this._onFileChanged);

    this._panel = null;
  }

  /**
   * Callback to react to cells list changes
   *
   * @param cells List of notebook cells
   * @param changed Modification of the list
   */
  updateConnectedCells(
    cells: IObservableUndoableList<ICellModel>,
    changed: IObservableList.IChangedArgs<ICellModel>
  ): void {
    changed.oldValues.forEach(model => this._removeToolbar(model));
    changed.newValues.forEach(model => this._addToolbar(model));
  }

  private _addToolbar(model: ICellModel): void {
    const cell = this._getCell(model);

    if (cell) {
      const {
        helperButtons,
        leftMenu,
        rightMenu,
        leftSpace,
        floatPosition,
        showTags
      } = (this._settings?.composite as any) ?? {};

      const helperButtons_ =
        helperButtons === null
          ? []
          : helperButtons ??
            DEFAULT_HELPER_BUTTONS.map(entry => entry.command.split(':')[1]);
      const leftMenu_ = leftMenu === null ? [] : leftMenu ?? DEFAULT_LEFT_MENU;
      const rightMenu_ = rightMenu ?? [];
      const leftSpace_ = leftSpace ?? 0;
      const showTags_ = showTags ?? true;

      const tagsModel = showTags_
        ? (this._tagsModels[model.id] = new TagsModel(
            model,
            this._allTags,
            this._unlockTagsButton.toggled
          ))
        : null;

      const toolbar = new CellToolbarWidget(
        this._commands,
        tagsModel,
        leftMenu_,
        rightMenu_,
        leftSpace_,
        floatPosition
      );
      toolbar.addClass(CELL_BAR_CLASS);
      (cell.layout as PanelLayout).insertWidget(0, toolbar);

      DEFAULT_HELPER_BUTTONS.filter(entry =>
        (helperButtons_ as string[]).includes(entry.command.split(':')[1])
      ).forEach(entry => {
        if (this._commands.hasCommand(entry.command)) {
          const { cellType, command, tooltip, ...others } = entry;
          const shortName = command.split(':')[1];
          const button = new PositionedButton({
            ...others,
            callback: (): void => {
              this._commands.execute(command);
            },
            className: shortName && `jp-enh-cell-${shortName}`,
            tooltip: tooltip || this._commands.label(entry.command)
          });
          button.addClass(CELL_BAR_CLASS);
          button.addClass(`jp-enh-cell-${cellType || 'all'}`);
          (cell.layout as PanelLayout).addWidget(button);
        }
      });
    }
  }

  private _getCell(model: ICellModel): Cell | undefined {
    return this._panel?.content.widgets.find(widget => widget.model === model);
  }

  private _findToolbarWidgets(cell: Cell): Widget[] {
    const widgets = (cell.layout as PanelLayout).widgets;

    // Search for header using the CSS class or use the first one if not found.
    return widgets.filter(widget => widget.hasClass(CELL_BAR_CLASS)) || [];
  }

  private _removeToolbar(model: ICellModel): void {
    const cell = this._getCell(model);
    if (cell) {
      this._findToolbarWidgets(cell).forEach(widget => widget.dispose());
      if (this._tagsModels[model.id]) {
        this._tagsModels[model.id].dispose();
        delete this._tagsModels[model.id];
      }
    }
  }

  /**
   * Callback on file changed
   */
  private _onFileChanged(): void {
    this._unlockTagsButton.update();
  }

  /**
   * Call back on settings changes
   */
  private _onSettingsChanged(): void {
    if (this._settings?.composite['showTags'] ?? true) {
      this._unlockTagsButton.show();
    } else {
      this._unlockTagsButton.hide();
    }

    // Reset toolbar when settings changes
    if (this._panel?.context.model.cells) {
      each(this._panel?.context.model.cells.iter(), model => {
        this._removeToolbar(model);
        this._addToolbar(model);
      });
    }

    // Update tags
    const newDefaultTags =
      (this._settings?.composite['defaultTags'] as string[]) ?? [];
    // Update default tag in shared tag list
    const toAdd = newDefaultTags.filter(
      tag => !this._previousDefaultTags.includes(tag)
    );
    if (toAdd.length > 0) {
      this._allTags.pushAll(toAdd);
    }
    this._previousDefaultTags
      .filter(tag => !newDefaultTags.includes(tag))
      .forEach(tag => this._allTags.removeValue(tag));
    this._previousDefaultTags = newDefaultTags;
  }

  private _allTags: ObservableList<string> = new ObservableList<string>();
  private _commands: CommandRegistry;
  private _isDisposed = false;
  private _previousDefaultTags = new Array<string>();
  private _panel: NotebookPanel | null;
  private _settings: ISettingRegistry.ISettings | null;
  private _tagsModels: { [id: string]: TagsModel } = {};
  private _unlockTagsButton: ToggleButton;
}

/**
 * Widget extension that creates a CellToolbarTracker each time a notebook is
 * created.
 */
export class CellBarExtension implements DocumentRegistry.WidgetExtension {
  constructor(
    commands: CommandRegistry,
    settings: ISettingRegistry.ISettings | null
  ) {
    this._commands = commands;
    this._settings = settings;
  }

  createNew(panel: NotebookPanel): IDisposable {
    return new CellToolbarTracker(panel, this._commands, this._settings);
  }

  private _commands: CommandRegistry;
  private _settings: ISettingRegistry.ISettings | null;
}
