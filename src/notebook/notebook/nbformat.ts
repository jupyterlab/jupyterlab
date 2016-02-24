// Notebook format interfaces
// https://nbformat.readthedocs.org/en/latest/format_description.html
// https://github.com/jupyter/nbformat/blob/master/nbformat/v4/nbformat.v4.schema.json

import {
  MimeBundle, OutputType
} from '../output-area';

import {
  CellType
} from '../cells';


// In the notebook format *disk* representation, this would be string | string[]
export type multilineString = string;


/**
 * The major version of the notebook format.
 */
export 
const MAJOR_VERSION = 4;

/**
 * The minor version of the notebook format.
 */
export 
const MINOR_VERSION = 0;


export
interface BaseOutput {
  output_type: OutputType;
}

export
interface DisplayData extends BaseOutput {
  output_type: "display_data";
  data: MimeBundle;
  metadata: {};
}

export
interface ExecuteResult extends BaseOutput {
  output_type: "execute_result";
  execution_count: number;
  data: MimeBundle;
  metadata: {};
}

export
interface Stream extends BaseOutput {
  output_type: "stream";
  name: string;
  text: multilineString;
}

export
interface JupyterError extends BaseOutput {
  output_type: "error";
  ename: string;
  evalue: string;
  traceback: string[];
}

export
type Output = ExecuteResult | DisplayData | Stream | JupyterError;

export
function isExecuteResult(d: BaseOutput): d is ExecuteResult {
  return d.output_type === "execute_result";
}

export
function isDisplayData(d: BaseOutput): d is DisplayData {
  return d.output_type === "display_data";
}

export
function isStream(d: BaseOutput): d is Stream {
  return d.output_type === "stream";
}

export
function isJupyterError(d: BaseOutput): d is JupyterError {
  return d.output_type === "error";
}

export
type Cell = BaseCell | RawCell | MarkdownCell | CodeCell;

export
interface BaseCell {
  cell_type: CellType;
  source: multilineString;
  metadata: {
    name?: string;
    tags?: string[];
  }
}

export
interface RawCell extends BaseCell {
  cell_type: "raw";
  metadata: {
    format?: string;
  }
}

export
interface MarkdownCell extends BaseCell {
  cell_type: "markdown";
}

export
interface CodeCell extends BaseCell {
  cell_type: "code";
  metadata: {
    name?: string;
    tags?: string[];
    collapsed?: boolean;
    scrolled?: boolean | string;
  }
  outputs: Output[];
  execution_count: number;
}

export
function isMarkdownCell(d: BaseCell): d is MarkdownCell {
  return d.cell_type === "markdown";
}

export
function isCodeCell(d: BaseCell): d is CodeCell {
  return d.cell_type === "code";
}

export
interface NotebookMetadata {
  kernelspec: {
    name: string;
    display_name: string;
  };
  language_info: {
    name: string;
    codemirror_mode?: string | {};
    file_extension?: string;
    mimetype?: string;
    pygments_lexer?: string
  };
  orig_nbformat?: number;
}


export
interface NotebookContent {
  metadata: NotebookMetadata
  nbformat_minor: number;
  nbformat: number;
  cells: Cell[];
}
