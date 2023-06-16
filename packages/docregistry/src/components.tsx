import { ReactWidget } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';
import * as React from 'react';

import { IDocumentWidget } from './index';

/**
 * Namespace for ToolbarButtonComponent.
 */
export namespace ReadOnlyLabelComponent {
  /**
   * Interface for ToolbarButtonComponent props.
   */
  export interface IProps {
    panel: IDocumentWidget;
    writable?: boolean;
    type?: string;
    /**
     * The application language translator.
     */
    trans?: ITranslator | null;
  }
}

export function ReadOnlyLabelComponent(
  props: ReadOnlyLabelComponent.IProps
): JSX.Element {
  let trans = (props.trans ?? nullTranslator).load('jupyterlab');
  const readOnly = !props.writable;
  if (readOnly) {
    console.log(trans);
    return (
      <div>
        <span
          className="jp-ToolbarLabelComponent"
          title={trans.__(
            `document is permissioned readonly; "save" is disabled, use "save as..." instead`
          )}
        >
          {trans.__(`%1 is read-only`, props.type)}
        </span>
      </div>
    );
  } else {
    if (props.type === 'file') {
      // props.panel.toolbar.children
      props.panel.toolbar.addClass('jp-Toolbar-micro');
      // props.panel.addClass('lm-mod-hidden')
    }
    return <></>;
  }
}

/**
 * create readonly label toolbar item
 */
export function createReadonlyLabel(
  panel: IDocumentWidget,
  translator?: ITranslator
): Widget {
  // let trans = (translator ?? nullTranslator).load('jupyterlab');
  // console.log(trans)
  let widget = ReactWidget.create(
    // <UseSignal signal={panel.context.fileChanged}>
    //   {() => (
    <ReadOnlyLabelComponent
      panel={panel}
      writable={panel.context.contentsModel?.writable}
      type={panel.context.contentsModel?.type}
      trans={translator}
    />
    //   )}
    // </UseSignal>
  );
  widget.addClass('readOnlyIndicator');
  console.log(widget);
  if (panel.context.contentsModel?.writable) {
    console.log('hiding: ', panel.context.contentsModel?.writable);
    widget.hide();
  }
  return widget;
}
