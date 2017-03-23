// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Notebook format interfaces
// https://nbformat.readthedocs.io/en/latest/format_description.html
// https://github.com/jupyter/nbformat/blob/master/nbformat/v4/nbformat.v4.schema.json

import {
  JSONObject, JSONExt
} from '@phosphor/coreutils';


/**
 * A namespace for nbformat interfaces.
 */
export
namespace nbformat {
  /**
   * The major version of the notebook format.
   */
  export
  const MAJOR_VERSION: number = 4;

  /**
   * The minor version of the notebook format.
   */
  export
  const MINOR_VERSION: number = 1;

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
    kernelspec?: IKernelspecMetadata;
    language_info?: ILanguageInfoMetadata;
    orig_nbformat?: number;
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
   * A multiline string.
   */
  export
  type MultilineString = string | string[];

  /**
   * A mime-type keyed dictionary of data.
   */
  export
  interface IMimeBundle extends JSONObject {
    [key: string]: MultilineString | JSONObject;
  }

  /**
   * Media attachments (e.g. inline images).
   */
  export
  interface IAttachments {
    [key: string]: IMimeBundle;
  }

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  export
  type ExecutionCount = number | null;

  /**
   * Cell output metadata.
   */
  export
  type OutputMetadata = JSONObject;

  /**
   * Validate a mime type/value pair.
   *
   * @param type - The mimetype name.
   *
   * @param value - The value associated with the type.
   *
   * @returns Whether the type/value pair are valid.
   */
  export
  function validateMimeValue(type: string, value: MultilineString | JSONObject): boolean {
    // Check if "application/json" or "application/foo+json"
    const jsonTest = /^application\/(.*?)+\+json$/;
    const isJSONType = type === 'application/json' || jsonTest.test(type);

    let isString = (x: any) => {
      return Object.prototype.toString.call(x) === '[object String]';
    };

    // If it is an array, make sure if is not a JSON type and it is an
    // array of strings.
    if (Array.isArray(value)) {
      if (isJSONType) {
        return false;
      }
      let valid = true;
      (value as string[]).forEach(v => {
        if (!isString(v)) {
          valid = false;
        }
      });
      return valid;
    }

    // If it is a string, make sure we are not a JSON type.
    if (isString(value)) {
      return !isJSONType;
    }

    // It is not a string, make sure it is a JSON type.
    if (!isJSONType) {
      return false;
    }

    // It is a JSON type, make sure it is a valid JSON object.
    return JSONExt.isObject(value);
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
  interface IBaseCellMetadata extends JSONObject {
    /**
     * Whether the cell is trusted.
     *
     * #### Notes
     * This is not strictly part of the nbformat spec, but it is added by
     * the contents manager.
     *
     * See https://jupyter-notebook.readthedocs.io/en/latest/security.html.
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
    source: MultilineString;

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

    /**
     * Cell attachments.
     */
    attachments?: IAttachments;
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

    /**
     * Cell attachments.
     */
    attachments?: IAttachments;
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
    execution_count: ExecutionCount;
  }

  /**
   * A cell union type.
   */
  export
  type ICell = IRawCell | IMarkdownCell | ICodeCell;


  /**
   * A union metadata type.
   */
  export
  type ICellMetadata = IBaseCellMetadata | IRawCellMetadata | ICodeCellMetadata;

  /**
   * The valid output types.
   */
  export
  type OutputType = 'execute_result' | 'display_data' | 'stream' | 'error';

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
    execution_count: ExecutionCount;

    /**
     * A mime-type keyed dictionary of data.
     */
    data: IMimeBundle;

    /**
     * Cell output metadata.
     */
    metadata: OutputMetadata;
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
    data: IMimeBundle;

    /**
     * Cell output metadata.
     */
    metadata: OutputMetadata;
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
    text: MultilineString;
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
}
