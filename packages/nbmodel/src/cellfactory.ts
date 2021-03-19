import { ISharedCodeCell, ISharedRawCell, ISharedMarkdownCell } from './api';
import { YCodeCell, YRawCell, YMarkdownCell } from './ymodel';

/**
 * Shared cells can be inserted into a SharedNotebook.
 *
 * Shared cells only start emitting events when they are connected to a SharedNotebook.
 */
export class SharedCellFactory {
  public static createCodeCell(): ISharedCodeCell {
    return YCodeCell.create() as any;
  }
  public static createRawCell(): ISharedRawCell {
    return YRawCell.create() as ISharedRawCell;
  }
  public static createMarkdownCell(): ISharedMarkdownCell {
    return YMarkdownCell.create() as ISharedMarkdownCell;
  }
}

/**
 * They "standalone" and must not be inserted into a (Shared)Notebook.
 *
 * Standalone cells emit events immediately after they have been created, but they must not
 * be included into a (Shared)Notebook.
 */
export class StandaloneCellFactory {
  public static createCodeCell(): ISharedCodeCell {
    return YCodeCell.createStandalone() as any;
  }
  public static createRawCell(): ISharedRawCell {
    return YRawCell.createStandalone() as ISharedRawCell;
  }
  public static createMarkdownCell(): ISharedMarkdownCell {
    return YMarkdownCell.createStandalone() as ISharedMarkdownCell;
  }
}
