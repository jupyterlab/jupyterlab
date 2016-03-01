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
    codemirror_mode?: any;
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


/**
 * A type alias for a multiline string.
 */
export 
type multilineString = string | string[];


/**
 * A mime-type keyed dictionary of data.
 */
export interface MimeBundle {
  [key: string]: multilineString;
  'application/json'?: any;
}


/**
 * A type which describes the type of cell.
 */
export
type CellType = 'code' | 'markdown' | 'raw';


/**
 * Cell-level metadata.
 */
export
interface IBaseCellMetadata {
  /**
   * The cell's name. If present, must be a non-empty string.
   */
  name?: string;

  /**
   * The cell's tags. Tags must be unique, and must not contain commas.
   */
  tags?: string[];
}


/**
 * The base cell interface.
 */
export
interface IBaseCell {
  /**
   * String identifying the type of cell.
   */
  cell_type: CellType;

  /**
   * Contents of the cell, represented as an array of lines.
   */
  source: multilineString;

  /**
   * Cell-level metadata.
   */
  metadata: ICellMetadata;
}


/**
 * Metadata for the raw cell.
 */
export 
interface IRawCellMetadata extends IBaseCellMetadata {
  /**
   * Raw cell metadata format for nbconvert.
   */
  format?: string;
}


/**
 * A raw cell.
 */
export
interface IRawCell extends IBaseCell {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'raw';

  /**
   * Cell-level metadata.
   */
  metadata: IRawCellMetadata;
}


/**
 * A markdown cell.
 */
export
interface IMarkdownCell extends IBaseCell {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'markdown';
}


/**
 * Metadata for a code cell.
 */
export
interface ICodeCellMetadata extends IBaseCellMetadata {
  /**
   * Whether the cell is collapsed/expanded.
   */
  collapsed?: boolean;

  /**
   * Whether the cell's output is scrolled, unscrolled, or autoscrolled.
   */
  scrolled?: boolean | 'auto';
}


/**
 * A code cell.
 */
export
interface ICodeCell extends IBaseCell {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'code';

  /**
   * Cell-level metadata.
   */
  metadata: ICodeCellMetadata;

  /**
   * Execution, display, or stream outputs.
   */
  outputs: IOutput[];

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  execution_count: number;
}


/**
 * A cell union type.
 */
export
type ICell = IBaseCell | IRawCell | IMarkdownCell | ICodeCell;


/**
 * A union metadata type.
 */
export
type ICellMetadata = IBaseCellMetadata | IRawCellMetadata | ICodeCellMetadata;


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
 * The valid output types.
 */
export 
type OutputType = 'execute_result' | 'display_data' | 'stream' | 'error';


/**
 * The base output type.
 */
export
interface IBaseOutput {
  /**
   * Type of cell output.
   */
  output_type: OutputType;
}


/**
 * Result of executing a code cell.
 */
export
interface IExecuteResult extends IBaseOutput {
  /**
   * Type of cell output.
   */
  output_type: 'execute_result';

  /**
   * A result's prompt number.
   */
  execution_count: number;

  /**
   * A mime-type keyed dictionary of data.
   */
  data: MimeBundle;

  /**
   * Cell output metadata.
   */
  metadata: {};
}


/**
 * Data displayed as a result of code cell execution.
 */
export
interface IDisplayData extends IBaseOutput {
  /**
   * Type of cell output.
   */
  output_type: 'display_data';

  /**
   * A mime-type keyed dictionary of data.
   */
  data: MimeBundle;

  /**
   * Cell output metadata.
   */
  metadata: {};
}


/**
 * Stream output from a code cell.
 */
export
interface IStream extends IBaseOutput {
  /**
   * Type of cell output.
   */
  output_type: 'stream';

  /**
   * The name of the stream.
   */
  name: 'stdout' | 'stderr';

  /**
   * The stream's text output.
   */
  text: multilineString;
}


/** 
 * Output of an error that occurred during code cell execution.
 */
export
interface IError extends IBaseOutput {
  /**
   * Type of cell output.
   */
  output_type: 'error';

  /**
   * The name of the error.
   */
  ename: string;

  /**
   * The value, or message, of the error.
   */
  evalue: string;

  /**
   * The error's traceback.
   */
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
  return d.output_type === 'execute_result';
}


/**
 * Check if output is a `display_data`.
 */
export
function isDisplayData(d: IBaseOutput): d is IDisplayData {
  return d.output_type === 'display_data';
}


/**
 * Check if output is `stream`.
 */
export
function isStream(d: IBaseOutput): d is IStream {
  return d.output_type === 'stream';
}


/**
 * Check if output is `error`.
 */
export
function isError(d: IBaseOutput): d is IError {
  return d.output_type === 'error';
}
