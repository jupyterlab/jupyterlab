// Notebook format interfaces

// In the notebook format *disk* representation, this would be string | string[]
export type multilineString = string;

export
interface MimeBundle {
    // values are always multilineString if we pretend that the application/json key doesn't exist
    // in fact, the in-memory representation always is a string
    [key: string]: multilineString;

    // we fudge the standard a bit here by not telling Typescript about the application/json
    // key, which will be a Javascript object if it exists.  If we want to tell, then uncomment below:
    //"application/json": {};
}

export
interface BaseOutput {
    output_type: string;
}

export
interface ExecuteResult extends BaseOutput {
    output_type: string; // "execute_result"
    execution_count: number;
    data:  MimeBundle;
    metadata: {};
}

export
interface DisplayData extends BaseOutput {
    output_type: string; // "display_data"
    data: MimeBundle;
    metadata: {};
}

export
interface Stream extends BaseOutput {
    output_type: string; // "stream"
    name: string;
    text: multilineString;
}

export
interface JupyterError extends BaseOutput {
    output_type: string; // "error"
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
    cell_type: string;
    source: multilineString;
    metadata: {
        name?: string;
        tags?: string[];
    }
}

export
interface RawCell extends BaseCell {
    cell_type: string; /*"raw"*/
    metadata: {
        format?: string;
    }
}

export
interface MarkdownCell extends BaseCell {
    cell_type: string; /*"markdown"*/
}

export
interface CodeCell extends BaseCell {
    cell_type: string; /*"code"*/
    metadata: {
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
interface Notebook {
    metadata: {
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
    nbformat_minor: number;
    nbformat: number;
    cells: Cell[];
}

export
interface NBData {
    content: Notebook;
    name: string;
    path: string;
}
