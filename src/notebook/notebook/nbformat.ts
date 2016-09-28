// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Notebook format interfaces
// https://nbformat.readthedocs.org/en/latest/format_description.html
// https://github.com/jupyter/nbformat/blob/master/nbformat/v4/nbformat.v4.schema.json

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';


/**
 * A namespace for nbformat interfaces.
 */
export
namespace nbformat {
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
   * The kernelspec metadata.
   */
  export
  interface IKernelspecMetadata extends JSONObject {
    name: string;
    display_name: string;
  }

  /**
   * The language info metatda
   */
  export
  interface ILanguageInfoMetadata extends JSONObject {
    name: string;
    codemirror_mode?: string | JSONObject;
    file_extension?: string;
    mimetype?: string;
    pygments_lexer?: string;
  }


  /**
   * The default metadata for the notebook.
   */
  export
  interface INotebookMetadata extends JSONObject {
    kernelspec: IKernelspecMetadata;
    language_info: ILanguageInfoMetadata;
    orig_nbformat: number;
  }


  /**
   * The notebook content.
   */
  export
  interface INotebookContent extends JSONObject {
    metadata: INotebookMetadata;
    nbformat_minor: number;
    nbformat: number;
    cells: ICell[];
  }


  /**
   * A type alias for a multiline string.
   *
   * #### Notes
   * On disk, this could be a string[] too.
   */
  export
  type multilineString = string | string[];


  /* tslint:disable */
  /**
   * A mime-type keyed dictionary of data.
   */
  export
  interface MimeBundle extends JSONObject {
    [key: string]: multilineString;
    'application/json'?: any;
  }
  /* tslint:enable */


  /**
   * A type which describes the type of cell.
   */
  export
  type CellType = 'code' | 'markdown' | 'raw';


  /**
   * Cell-level metadata.
   */
  export
  interface IBaseCellMetadata extends JSONObject {
    /**
     * Whether the cell is trusted.
     *
     * #### Notes
     * This is not strictly part of the nbformat spec, but it is added by
     * the contents manager.
     *
     * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
     */
    trusted: boolean;

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
  interface IBaseCell extends JSONObject {
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
   * The valid output types.
   */
  export
  type OutputType = 'execute_reply' | 'execute_result' | 'display_data' | 'stream' | 'error';


  /**
   * The base output type.
   */
  export
  interface IBaseOutput extends JSONObject {
    /**
     * Type of cell output.
     */
    output_type: OutputType;
  }


  /**
   * Result of a non-execution reply to a code cell execution.
   */
  export
  interface IExecuteReply extends IBaseOutput {
    /**
     * Type of cell output.
     */
    output_type: 'execute_reply';

    /**
     * A result's prompt number.
     */
    execution_count: number;

    /**
     * A mime-type keyed dictionary of data.
     */
    data: MimeBundle;
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
    metadata: JSONObject;
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
    metadata: JSONObject;
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
  type IOutput = IExecuteReply | IExecuteResult | IDisplayData | IStream | IError;
}
