/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';
import * as React from 'react';

import { IDocumentWidget } from './index';

/**
 * create readonly label toolbar item
 */
export function createReadonlyLabel(
  panel: IDocumentWidget,
  translator?: ITranslator
): Widget {
  let trans = (translator ?? nullTranslator).load('jupyterlab');
  return ReactWidget.create(
    <div>
      <span
        className="jp-ToolbarLabelComponent"
        title={trans.__(
          `Document is read-only. "Save" is disabled; use "Save as…" instead`
        )}
      >
        {trans.__(`%1 is read-only`, panel.context.contentsModel?.type)}
      </span>
    </div>
  );
}
