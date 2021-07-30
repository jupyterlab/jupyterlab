/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';

import { ExpandableComponent } from './ExpandableComponent';

const MESSAGE_DISPLAY = 'elyra-errorDialog-messageDisplay';
const ERROR_DIALOG_WIDTH = 600;
const ERROR_DIALOG_HEIGHT = 400;
const JP_DIALOG_CONTENT = 'jp-Dialog-content';

interface IErrorDialogProps {
  reason: string;
  message: string;
  timestamp: string;
  traceback: string;
  defaultMessage: string;
}

export const ExpandableErrorDialog: React.FC<IErrorDialogProps> = ({
  reason,
  message,
  timestamp,
  traceback,
  defaultMessage
}) => {
  const [collapsedSize, setCollapsedSize] = React.useState<{
    width: number;
    height: number;
  }>();

  const handleUpdateDialogSize = React.useCallback(
    (expanded: boolean): void => {
      const dialogNode = document.querySelector<HTMLDivElement>(
        '.' + JP_DIALOG_CONTENT
      );
      if (dialogNode === null) {
        return;
      }
      const width = dialogNode.clientWidth;
      const height = dialogNode.clientHeight;

      if (
        expanded &&
        (width < ERROR_DIALOG_WIDTH || height < ERROR_DIALOG_HEIGHT)
      ) {
        setCollapsedSize({ width, height });
        dialogNode.style.width = Math.max(width, ERROR_DIALOG_WIDTH) + 'px';
        dialogNode.style.height = Math.max(height, ERROR_DIALOG_HEIGHT) + 'px';
      } else if (!expanded && collapsedSize) {
        dialogNode.style.width = collapsedSize.width + 'px';
        dialogNode.style.height = collapsedSize.height + 'px';
      }
    },
    [collapsedSize, setCollapsedSize]
  );

  return (
    <div className={MESSAGE_DISPLAY}>
      <div>{message}</div>
      {traceback ? (
        <ExpandableComponent
          displayName="Error details: "
          tooltip="Error stack trace"
          onBeforeExpand={handleUpdateDialogSize}
        >
          <pre>{traceback}</pre>
        </ExpandableComponent>
      ) : null}
      <div>{defaultMessage}</div>
    </div>
  );
};
