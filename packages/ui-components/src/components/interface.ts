// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export const DEFAULT_STYLE_CLASS = 'jp-DefaultStyle';

export interface IElementRefProps<E extends HTMLElement> {
  /** Ref handler to access the instance of the internal HTML element. */
  elementRef?: (ref: E | null) => void;
}
