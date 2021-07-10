import { MarkdownCell } from '@jupyterlab/cells';
import { Cell } from '@jupyterlab/cells';

/**
 * Determines the collapsed state of a header in the ToC. If syncCollapseState setting
 * is set to true, toc state is also updated to match the state of the Notebook header
 *
 * @param cell - cell containing the header in the notebook
 * @param syncCollapseState - setting indicating if header cell collapse state and ToC collapse state should match
 */

export function headerCollapsedState(
  cell?: Cell,
  syncCollapseState?: boolean
): boolean {
  let collapsed;
  let tocCollapsed;
  if (cell!.model.metadata.has('toc-hr-collapsed')) {
    tocCollapsed = cell!.model.metadata.get('toc-hr-collapsed') as boolean;
  }
  if (syncCollapseState) {
    let cellCollapsed;
    if (cell instanceof MarkdownCell) {
      cellCollapsed = cell!.headingCollapsed!;
    }
    if (tocCollapsed !== cellCollapsed) {
      setToCHeaderCollapsed(cell, cellCollapsed);
    }
    collapsed = tocCollapsed || cellCollapsed;
  } else {
    collapsed = tocCollapsed || false;
  }
  return collapsed || false;
}

/**
 * Sets the ToC header collapsed state on the header notebook cell
 *
 *
 * @param cell - cell containing the header in the notebook
 * @param collapsed - boolean indicating the state the ToC header should have
 */
export function setToCHeaderCollapsed(cell?: Cell, collapsed?: boolean) {
  if (collapsed) {
    cell!.model.metadata.set('toc-hr-collapsed', true);
  } else {
    cell!.model.metadata.delete('toc-hr-collapsed');
  }
}
