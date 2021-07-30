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

import '../style/index.css';

import {
  caretDownIcon,
  caretRightIcon,
  LabIcon
} from '@jupyterlab/ui-components';
import * as React from 'react';

import { FeedbackButton } from './FeedbackButton';

/**
 * The CSS class for expandable containers.
 */
const DETAILS_VISIBLE_CLASS = 'elyra-expandableContainer-details-visible';
const DETAILS_HIDDEN_CLASS = 'elyra-expandableContainer-details-hidden';
const DISPLAY_NAME_CLASS = 'elyra-expandableContainer-name';
const ELYRA_BUTTON_CLASS = 'elyra-button';
const BUTTON_CLASS = 'elyra-expandableContainer-button';
const TITLE_CLASS = 'elyra-expandableContainer-title';
const ACTION_BUTTONS_WRAPPER_CLASS = 'elyra-expandableContainer-action-buttons';
const ACTION_BUTTON_CLASS = 'elyra-expandableContainer-actionButton';
const DRAGGABLE_CLASS = 'elyra-expandableContainer-draggable';

/**
 * Expandable container props.
 */
export interface IExpandableActionButton {
  title: string;
  icon: LabIcon;
  onClick: () => any;
  feedback?: string;
}

export interface IExpandableComponentProps {
  displayName: string;
  tooltip: string;
  actionButtons?: IExpandableActionButton[];
  onExpand?: (isExpanded: boolean) => any;
  onBeforeExpand?: (isExpanded: boolean) => any;
  onMouseDown?: (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => any;
}

/**
 * A React component for expandable containers.
 */
export const ExpandableComponent: React.FC<IExpandableComponentProps> = ({
  displayName,
  tooltip,
  actionButtons = [],
  onExpand,
  onBeforeExpand,
  onMouseDown,
  children
}) => {
  const [expanded, setExpandedValue] = React.useState(false);

  const handleToggleDetailsDisplay = (): void => {
    // Switch expanded flag
    const newExpandFlag = !expanded;
    onBeforeExpand?.(newExpandFlag);
    setExpandedValue(newExpandFlag);
  };

  React.useEffect((): void => {
    onExpand?.(expanded);
  });

  const buttonClasses = [ELYRA_BUTTON_CLASS, BUTTON_CLASS].join(' ');

  return (
    <div>
      <div key={displayName} className={TITLE_CLASS}>
        <button
          className={buttonClasses}
          title={expanded ? 'Hide Details' : 'Show Details'}
          onClick={handleToggleDetailsDisplay}
        >
          {expanded ? (
            <caretDownIcon.react
              tag="span"
              elementPosition="center"
              width="20px"
            />
          ) : (
            <caretRightIcon.react
              tag="span"
              elementPosition="center"
              width="20px"
            />
          )}
        </button>
        <span
          title={tooltip}
          className={
            onMouseDown
              ? DISPLAY_NAME_CLASS
              : DISPLAY_NAME_CLASS + ' ' + DRAGGABLE_CLASS
          }
          onClick={handleToggleDetailsDisplay}
          onMouseDown={(event): void => {
            onMouseDown?.(event);
          }}
        >
          {displayName}
        </span>

        <div className={ACTION_BUTTONS_WRAPPER_CLASS}>
          {actionButtons.map((btn: IExpandableActionButton) => {
            return (
              <FeedbackButton
                key={btn.title}
                title={btn.title}
                feedback={btn.feedback ?? ''}
                className={buttonClasses + ' ' + ACTION_BUTTON_CLASS}
                onClick={btn.onClick}
              >
                <btn.icon.react
                  tag="span"
                  elementPosition="center"
                  width="16px"
                />
              </FeedbackButton>
            );
          })}
        </div>
      </div>
      <div className={expanded ? DETAILS_VISIBLE_CLASS : DETAILS_HIDDEN_CLASS}>
        {children}
      </div>
    </div>
  );
};
