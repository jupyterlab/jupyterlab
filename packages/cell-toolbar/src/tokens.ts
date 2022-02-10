import { LabIcon } from '@jupyterlab/ui-components';

export const EXTENSION_ID = '@jupyterlab/cell-toolbar';

/**
 * Menu action interface
 */
export interface ICellMenuItem {
  /**
   * Command to be triggered
   */
  command: string;
  /**
   * Icon for the item
   */
  icon: LabIcon | string;
  /**
   * Icon tooltip
   */
  tooltip?: string;
  /**
   * Type of cell it applies on
   *
   * Undefined if it applies on all cell types
   */
  cellType?: 'code' | 'markdown' | 'raw';
}
