// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { UseSignal } from '@jupyterlab/ui-components';

import React from 'react';

import type { IDebugger } from '../../tokens';

import { Search } from '@jupyter/react-components';
import type { TranslationBundle } from '@jupyterlab/translation';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;

  /**
   * The language bundle.
   */
  trans: TranslationBundle;
}

const FilterBox = (props: IFilterBoxProps) => {
  const onFilterChange = (event: CustomEvent<unknown>) => {
    const target = event.target;
    if (!hasStringValue(target)) {
      console.error(
        'Search input event target does not provide a string value.'
      );
      return;
    }
    props.model.filter = target.value;
  };
  return (
    <Search
      onInput={onFilterChange}
      placeholder={props.trans.__('Filter sources')}
      value={props.model.filter}
      className="jp-Debugger-KernelSources-Filter"
    />
  );
};

function hasStringValue(
  target: EventTarget | null
): target is EventTarget & { value: string } {
  return (
    target !== null && 'value' in target && typeof target.value === 'string'
  );
}

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const KernelSourcesFilter = (props: IFilterBoxProps) => {
  return (
    <UseSignal
      signal={props.model.filterChanged}
      initialArgs={props.model.filter}
    >
      {model => <FilterBox model={props.model} trans={props.trans} />}
    </UseSignal>
  );
};
