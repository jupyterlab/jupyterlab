import { MarkdownCell } from '@jupyterlab/cells';
import { Cell } from '@jupyterlab/cells';

export function headerCollapsedState(cell?: Cell): boolean {
  let tocCollapsed;
  if (cell!.model.metadata.has('toc-hr-collapsed')) {
    tocCollapsed = cell!.model.metadata.get('toc-hr-collapsed') as boolean;
  }
  let cellCollapsed;
  if (cell instanceof MarkdownCell) {
    cellCollapsed = cell!.headingCollapsed!;
  }
  if (tocCollapsed !== cellCollapsed) {
    setToCHeaderCollapsed(cell, cellCollapsed);
  }
  let collapsed = tocCollapsed || cellCollapsed;
  return collapsed || false;
}

function setToCHeaderCollapsed(cell?: Cell, collapsed?: boolean) {
  if (collapsed) {
    cell!.model.metadata.set('toc-hr-collapsed', true);
  } else {
    cell!.model.metadata.delete('toc-hr-collapsed');
  }
}
