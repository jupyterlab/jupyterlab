/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Widget
} from '@phosphor/widgets';


const CELL_HEADER_CLASS = 'jp-CellHeader';

const CELL_FOOTER_CLASS = 'jp-CellFooter';


export
interface ICellHeader extends Widget {}


/**
 * Default implementation of the cell header is a Widget with a class
 */
export
class CellHeader extends Widget implements ICellHeader {
    constructor() {
        super();
        this.addClass(CELL_HEADER_CLASS);
    }
}


export
interface ICellFooter extends Widget {}


/**
 * Default implementation of the cell footer is a Widget with a class
 */
export
class CellFooter extends Widget implements ICellFooter {
    constructor() {
    super();
    this.addClass(CELL_FOOTER_CLASS);
}
}