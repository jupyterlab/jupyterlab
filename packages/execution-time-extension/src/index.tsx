/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as moment from 'moment';
import * as momentDurationFormatSetup from 'moment-duration-format';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {
    JupyterLab,
    JupyterLabPlugin,
} from '@jupyterlab/application';

import {
    CodeCellModel,
    ICellModel,
} from '@jupyterlab/cells';

import {
    CellTools,
    ICellTools,
    INotebookTracker,
} from '@jupyterlab/notebook';

import {
    IObservableJSON,
    IObservableMap,
} from '@jupyterlab/observables';

import {
    JSONObject,
    JSONValue,
} from '@phosphor/coreutils';

import '../style/index.css';

(momentDurationFormatSetup as any)(moment);

// Cell notebook metedata key for execution times.
const METADATA_KEY = 'ExecuteTime';

// Class for execution time tool.
const TOOL_CLASS = 'et-ExecutionTimeTool';

// Format for moment dates.
const MOMENT_FORMAT = 'HH:mm:ss YYYY-MM-DD';
// Format for moment durations.
const DURATION_FORMAT = 'y[y] w[w] d[d] h[h] m[m] s[s] S[ms]';

/**
 * Describes the format of the data stored at `METADATA_KEY`, in the cell metadata.
 */
export interface IExecutionTimeMetadata {
    start_time?: string;
    end_time?: string;
}

/**
 * Get's the execution time metadata from a cell model.
 */
function getMetadata(cellModel: ICellModel): IExecutionTimeMetadata {
    return cellModel.metadata.get(METADATA_KEY) as JSONObject as IExecutionTimeMetadata;
}

/**
 * Set's the execution time metadata in a cell model.
 */
function setMetadata(cellModel: ICellModel, metadata: IExecutionTimeMetadata) {
    cellModel.metadata.set(METADATA_KEY, metadata as JSONObject);
}

/**
 * Props describing a full specified execution time,
 * with both the start and end time parsed.
 */
interface IValidExecutionTime {
    start: moment.Moment;
    end: moment.Moment;
}

/**
 * Component that formats a valid exeuction time. 
 */
function ValidExecutionTime({start, end}: IValidExecutionTime) {
    const duration = moment.duration(end.diff(start)) as any;
    return (
        <span>
            Last executed {start.format(MOMENT_FORMAT)}{' '}
            in {duration.format(DURATION_FORMAT)}
        </span>
    );
}

/**
 * A cell tool that displays the most recent execution time
 * of the cell.
 */
class ExecutionTimeTool extends CellTools.Tool {
    /**
     * Creates an ExecutetionTimeTool by styling the node.
     */
    constructor() {
        super();
        this.addClass(TOOL_CLASS);
    }

    /**
     * Handle a change to the active cell.
     * 
     * It should render the metadata for the new cell
     * and track it to see if it's metadata has changed.
     * It should also disconnect tracking for the previous cell.
     */
    protected onActiveCellChanged(_: any): void {
        const cell = this.parent.activeCell;
        if (!cell) {
            return;
        }
        this._disconnectCellModel();
        const cellModel = cell.model;
        this._render(getMetadata(cellModel));
        this._connectCellModel(cellModel);
    }

    /**
     * Dispose of the resources used, by stopping tracking on the selected cell.
     */
    dispose() {
        this._disconnectCellModel();
        super.dispose();
    }

    private _render(metadata: IExecutionTimeMetadata) {
        const validExecutionTime = this._parseMetadata(metadata);
        ReactDOM.render(
            validExecutionTime ? <ValidExecutionTime {...validExecutionTime} /> : <div />,
            this.node
        );
    }

    private _parseMetadata(metadata: IExecutionTimeMetadata): null | IValidExecutionTime {
        if (!metadata) {
            return null;
        }
        const {start_time, end_time} = metadata;
        if (!start_time || !end_time) {
            return null;
        }
        return {start: moment(start_time), end: moment(end_time)};
    }

    private _disconnectCellModel() {
        if (this._connectedCellModel) {
            this._connectedCellModel.metadata.changed.disconnect(this._onCellMetadataChanged, this);
            delete this._connectedCellModel;
        }
    }

    private _connectCellModel(cellModel: ICellModel) {
        if (cellModel.metadata.changed.connect(this._onCellMetadataChanged, this)) {
            this._connectedCellModel = cellModel;
        }
    }

    private _onCellMetadataChanged(_: IObservableJSON, {key, newValue}: IObservableMap.IChangedArgs<JSONValue>) {
        if (key === METADATA_KEY) {
            this._render(newValue as IExecutionTimeMetadata);
        }
    }

    private _connectedCellModel: ICellModel;
}


/**
 * The Execution Time extension.
 */
const plugin: JupyterLabPlugin<void> = {
    activate,
    id: '@jupyterlab/execution-time-extension:plugin',
    requires: [INotebookTracker, ICellTools],
    autoStart: true
};
export default plugin;

/**
 * Activate the Execution Time plugin.
 */
function activate(app: JupyterLab, notebooks: INotebookTracker, cellTools: ICellTools): void {
    cellTools.addItem({tool: new ExecutionTimeTool()});

    // Whenever a reply message is recieved, extract out the start and end time
    // of that command and update the cell's metadata.
    notebooks.widgetAdded.connect((_, notebookPanel) => {
        notebookPanel.model.cells.changed.connect((_, {newValues}) => {
            for (const cellModel of newValues) {
                if (cellModel instanceof CodeCellModel) {
                    cellModel.lastReplyMsg.connect((_, msg) => {
                        setMetadata(cellModel, {
                            start_time: msg.metadata.started as string,
                            end_time: msg.header.date as string
                        });
                    });
                }
            }
        });
    });
}

