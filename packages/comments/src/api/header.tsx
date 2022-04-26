// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';

import { getIdentity, setIdentityName } from './utils';

import { Awareness } from 'y-protocols/awareness';

import { editIcon, refreshIcon, saveIcon } from '@jupyterlab/ui-components';

import { ISignal, Signal } from '@lumino/signaling';
import { ILabShell } from '@jupyterlab/application';
import { CommentPanel } from './panel';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { CommentFileWidget } from './widget';
import { CommentFileModel } from './model';
/**
 * This type comes from @jupyterlab/apputils/vdom.ts but isn't exported.
 */
type ReactRenderElement =
  | Array<React.ReactElement<any>>
  | React.ReactElement<any>;

type IdentityProps = {
  awareness: Awareness | undefined;
  panel: CommentPanel;
};

type FileTitleProps = {
  panel: CommentPanel;
};

function FileTitle(props: FileTitleProps): JSX.Element {
  const panel = props.panel;

  const [isDirty, SetIsDirty] = React.useState(panel.model?.dirty ?? false);
  const [tooltip, SetTooltip] = React.useState(
    panel.fileWidget?.context.path ?? ''
  );
  const [filename, SetFilename] = React.useState(panel.sourcePath ?? '');

  const dirtySignalHandler = (_: any, change: IChangedArgs<any>): void => {
    if (change.name === 'dirty') {
      SetIsDirty(change.newValue);
    }
  };

  const pathChangedHandler = (_: any, newPath: string): void => {
    SetTooltip(panel.fileWidget?.context.path ?? '');
    SetFilename(panel.sourcePath ?? '');
  };

  const modelChangedHandler = (
    _: any,
    widget: CommentFileWidget | undefined
  ): void => {
    Signal.disconnectAll(dirtySignalHandler);

    SetTooltip(widget?.context.path ?? '');
    SetFilename(panel.sourcePath ?? '');

    if (widget == null) {
      return;
    }

    const model = widget.context.model as CommentFileModel;
    model.stateChanged.connect(dirtySignalHandler);
  };

  React.useEffect(() => {
    panel.modelChanged.connect(modelChangedHandler);
    const fileWidget = panel.fileWidget;
    if (fileWidget != null) {
      fileWidget.context.pathChanged.connect(pathChangedHandler);
    }

    return () => {
      Signal.disconnectAll(modelChangedHandler);
      Signal.disconnectAll(pathChangedHandler);
    };
  });

  return (
    <div title={tooltip}>
      <span className="jc-panelHeader-filename">{filename}</span>
      {isDirty && <div className="jc-DirtyIndicator" />}
    </div>
  );
}

function UserIdentity(props: IdentityProps): JSX.Element {
  const { awareness, panel } = props;
  const handleClick = () => {
    SetEditable(true);
  };
  const [editable, SetEditable] = React.useState(false);

  const IdentityDiv = () => {
    if (awareness != undefined) {
      return (
        <div
          contentEditable={editable}
          className={'jc-panelHeader-EditInputArea-' + editable}
          onKeyDown={handleKeydown}
          suppressContentEditableWarning={true}
        >
          {getIdentity(awareness).name}
        </div>
      );
    }
  };

  const handleKeydown = (event: React.KeyboardEvent): void => {
    const target = event.target as HTMLDivElement;
    if (event.key === 'Escape') {
      SetEditable(false);
      target.blur();
      return;
    } else if (event.key !== 'Enter') {
      return;
    } else if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (awareness != null) {
      const newName = target.textContent;
      if (newName == null || newName === '') {
        target.textContent = getIdentity(awareness).name;
      } else {
        setIdentityName(awareness, newName);
        panel.updateIdentity(awareness.clientID, newName);
      }
    }
    SetEditable(false);
  };
  return (
    <div className="jc-panelHeader-identity-container">
      {IdentityDiv()}
      <div onClick={() => handleClick()}>
        <editIcon.react className="jc-panelHeader-editIcon" />
      </div>
    </div>
  );
}

export class PanelHeader extends ReactWidget {
  constructor(options: PanelHeader.IOptions) {
    super();
    const { panel } = options;
    this._panel = panel;
    this.addClass('jc-panelHeader');
  }

  render(): ReactRenderElement {
    const refresh = () => {
      const fileWidget = this._panel.fileWidget;
      if (fileWidget == null) {
        return;
      }

      fileWidget.initialize();
    };

    const save = () => {
      const fileWidget = this._panel.fileWidget;
      if (fileWidget == null) {
        return;
      }

      void fileWidget.context.save();
      refresh();
    };

    return (
      <React.Fragment>
        <div className="jc-panelHeader-left">
          <UseSignal signal={this._renderNeeded}>
            {() => (
              <UserIdentity awareness={this._awareness} panel={this._panel} />
            )}
          </UseSignal>
          <FileTitle panel={this._panel} />
        </div>

        <div className="jc-panelHeader-right">
          {/* Inline style added to align icons */}
          <div
            title="Save comments"
            onClick={save}
            style={{ position: 'relative', bottom: '2px' }}
          >
            <saveIcon.react className="jc-Button" />
          </div>
          <div title="Refresh comments" onClick={refresh}>
            <refreshIcon.react className="jc-Button" />
          </div>
        </div>
      </React.Fragment>
    );
  }

  /**
   * A signal emitted when a React re-render is required.
   */
  get renderNeeded(): ISignal<this, void> {
    return this._renderNeeded;
  }

  get awareness(): Awareness | undefined {
    return this._awareness;
  }
  set awareness(newValue: Awareness | undefined) {
    this._awareness = newValue;
    this._renderNeeded.emit(undefined);
  }

  private _awareness: Awareness | undefined;
  private _panel: CommentPanel;
  private _renderNeeded = new Signal<this, void>(this);
}

export namespace PanelHeader {
  export interface IOptions {
    shell: ILabShell;
    panel: CommentPanel;
  }
}
