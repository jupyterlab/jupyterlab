import {
  defaultCellRenderer
} from '../../notebook/monaco/renderers';

import {
  ConsoleContent
} from '../content';

/**
 * A default Monaco renderer for a console.
 */
export
const defaultConsoleContentRenderer = new ConsoleContent.Renderer({
  bannerRenderer: defaultCellRenderer,
  promptRenderer: defaultCellRenderer,
  foreignCellRenderer: defaultCellRenderer
});
