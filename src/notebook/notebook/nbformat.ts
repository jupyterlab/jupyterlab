// Notebook format interfaces
// https://nbformat.readthedocs.org/en/latest/format_description.html
// https://github.com/jupyter/nbformat/blob/master/nbformat/v4/nbformat.v4.schema.json

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


/**
 * A type alias for a multiline string.
 * In the notebook format *disk* representation, this would be 
 * string | string[]
 */
export 
type multilineString = string;


/**
 * A Mime bundle of data.
 */
export interface MimeBundle {
  [key: string]: string;
  'application/json'?: any;
}


/**
 * The valid output types.
 */
export 
type IOutputType = 'execute_result' | 'display_data' | 'stream' | 'error';


/**
 * The base output type.
 */
export
interface IBaseOutput {
  output_type: IOutputType;
}


/**
 * The `display_data` output type.
 */
export
interface IDisplayData extends IBaseOutput {
  output_type: 'display_data';
  data: MimeBundle;
  metadata: {};
}


/**
 * The `execute_result` output type.
 */
export
interface IExecuteResult extends IBaseOutput {
  output_type: 'execute_result';
  execution_count: number;
  data: MimeBundle;
  metadata: {};
}


/**
 * The `stream` output type.
 */
export
interface IStream extends IBaseOutput {
  output_type: 'stream';
  name: 'stdout' | 'stderr';
  text: multilineString;
}


/** 
 * The `error` output type.
 */
export
interface IError extends IBaseOutput {
  output_type: 'error';
  ename: string;
  evalue: string;
  traceback: string[];
}


/**
 * An output union type.
 */
export
type IOutput = IExecuteResult | IDisplayData | IStream | IError;


/**
 * Check if output is an `execute_result`.
 */
export
function isExecuteResult(d: IBaseOutput): d is IExecuteResult {
  return d.output_type === "execute_result";
}


/**
 * Check if output is a `display_data`.
 */
export
function isDisplayData(d: IBaseOutput): d is IDisplayData {
  return d.output_type === "display_data";
}


/**
 * Check if output is `stream`.
 */
export
function isStream(d: IBaseOutput): d is IStream {
  return d.output_type === "stream";
}


/**
 * Check if output is `error`.
 */
export
function isError(d: IBaseOutput): d is IError {
  return d.output_type === "error";
}


/**
 * The base cell interface.
 */
export
interface IBaseCell {
  cell_type: 'raw' | 'markdown' | 'code';
  source: multilineString;
  metadata: {
    name?: string;
    tags?: string[];
  }
}


/**
 * A raw cell.
 */
export
interface IRawCell extends IBaseCell {
  cell_type: 'raw';
  metadata: {
    format?: string;
  }
}


/**
 * A markdown cell.
 */
export
interface IMarkdownCell extends IBaseCell {
  cell_type: 'markdown';
}



/**
 * A code cell.
 */
export
interface ICodeCell extends IBaseCell {
  cell_type: 'code';
  metadata: {
    name?: string;
    tags?: string[];
    collapsed?: boolean;
    scrolled?: boolean | string;
  }
  outputs: IOutput[];
  execution_count: number;
}


/**
 * A cell union type.
 */
export
type ICell = IBaseCell | IRawCell | IMarkdownCell | ICodeCell;


/**
 * Check if cell is of markdown type.
 */
export
function isMarkdownCell(d: IBaseCell): d is IMarkdownCell {
  return d.cell_type === 'markdown';
}


/**
 * Check if cell is of code type.
 */
export
function isCodeCell(d: IBaseCell): d is ICodeCell {
  return d.cell_type === 'code';
}


/**
 * Check if cell is of raw type.
 */
export
function isRawCell(d: IBaseCell): d is IRawCell {
  return d.cell_type === 'raw';
}


/**
 * The notebook metadata.
 */
export
interface INotebookMetadata {
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


/**
 * The notebook content.
 */
export
interface INotebookContent {
  metadata: INotebookMetadata
  nbformat_minor: number;
  nbformat: number;
  cells: ICell[];
}
