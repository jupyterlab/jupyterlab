// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';

import { StringExt } from '@lumino/algorithm';

import { InputGroup } from '@jupyterlab/ui-components';

import { ReactWidget } from '@jupyterlab/apputils';

import { Contents } from '@jupyterlab/services';

import { DirListing } from './listing';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  listing: DirListing;
  placeholder?: string;
}

/**
 * A text match score with associated content item.
 */
interface IScore {
  /**
   * The numerical score for the text match.
   */
  score: number;

  /**
   * The indices of the text matches.
   */
  indices: number[] | null;

  /**
   * The command item associated with the match.
   */
  item: Contents.IModel;
}

/**
 * Perform a fuzzy search on a single item.
 */
function fuzzySearch(item: Contents.IModel, query: string): IScore | null {
  let source = `${item.name}`;

  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // The regex for search word boundaries
  let rgx = /\b\w/g;

  // Search the source by word boundary.
  while (true) {
    // Find the next word boundary in the source.
    let rgxMatch = rgx.exec(source);

    // Break if there is no more source context.
    if (!rgxMatch) {
      break;
    }

    // Run the string match on the relevant substring.
    let match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

    // Break if there is no match.
    if (!match) {
      break;
    }

    // Update the match if the score is better.
    if (match && match.score <= score) {
      score = match.score;
      indices = match.indices;
    }
  }

  // Bail if there was no match.
  if (!indices || score === Infinity) {
    return null;
  }

  // Handle a split match.
  return {
    score,
    indices,
    item
  };
}

const FilterBox = (props: IFilterBoxProps) => {
  const [filter, setFilter] = useState('');

  /**
   * Handler for search input changes.
   */
  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    setFilter(target.value);
    props.listing.model.setFilter((item: Contents.IModel) => {
      // Run the fuzzy search for the item and query.
      let score = fuzzySearch(item, target.value);
      // Ignore the item if it is not a match.
      if (!score) {
        item.indices = [];
        return false;
      }
      item.indices = score.indices;
      return true;
    });
  };

  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      placeholder={props.placeholder}
      onChange={handleChange}
      value={filter}
    />
  );
};

/**
 * A widget which hosts a ...
 */
export const FilenameSearcher = (props: IFilterBoxProps) => {
  return ReactWidget.create(
    <FilterBox listing={props.listing} placeholder={props.placeholder} />
  );
};
