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

import * as React from 'react';

/**
 * The CSS class for feedback buttons.
 */
const ELYRA_FEEDBACKBUTTON_CLASS = 'elyra-feedbackButton';

export interface IFeedbackButtonProps {
  feedback?: string;
  onClick: () => void;
}

export const FeedbackButton: React.FC<React.HTMLProps<HTMLButtonElement> &
  IFeedbackButtonProps> = ({
  feedback,
  onClick,
  className,
  children,
  title
}) => {
  const [showFeedback, setShowFeedback] = React.useState(false);

  const handleClick = (): void => {
    onClick();

    if (feedback) {
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
      }, 750);
    }
  };

  const classes = `${ELYRA_FEEDBACKBUTTON_CLASS} ${className}`;

  return (
    <button
      title={title}
      className={classes}
      onClick={handleClick}
      data-feedback={showFeedback ? feedback : undefined}
    >
      {children}
    </button>
  );
};
