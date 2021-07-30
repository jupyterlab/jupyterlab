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
import { tagIcon } from '@elyra/ui-components';
import { InputGroup, checkIcon } from '@jupyterlab/ui-components';

import React from 'react';

interface IFilterMetadataProps {
  tags: string[];
  onFilter: (searchValue: string, filterTags: string[]) => void;
  namespaceId: string;
}

interface IFilterMetadataState {
  show: boolean;
  selectedTags: string[];
  searchValue: string;
}

const FILTER_OPTION = 'elyra-filter-option';
const FILTER_TAGS = 'elyra-filter-tags';
const FILTER_TAG = 'elyra-filter-tag';
const FILTER_TAG_LABEL = 'elyra-filter-tag-label';
const FILTER_CHECK = 'elyra-filter-check';
const FILTER_TOOLS = 'elyra-filterTools';
const FILTER_SEARCHBAR = 'elyra-searchbar';
const FILTER_SEARCHWRAPPER = 'elyra-searchwrapper';
const FILTER_CLASS = 'elyra-filter';
const FILTER_BUTTON = 'elyra-filter-btn';
const FILTER_EMPTY = 'elyra-filter-empty';

export class FilterTools extends React.Component<
  IFilterMetadataProps,
  IFilterMetadataState
> {
  constructor(props: IFilterMetadataProps) {
    super(props);
    this.state = { show: false, selectedTags: [], searchValue: '' };
    this.createFilterBox = this.createFilterBox.bind(this);
    this.renderFilterOption = this.renderFilterOption.bind(this);
    this.renderTags = this.renderTags.bind(this);
    this.renderAppliedTag = this.renderAppliedTag.bind(this);
    this.renderUnappliedTag = this.renderUnappliedTag.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.filterMetadata = this.filterMetadata.bind(this);
  }

  componentDidMount(): void {
    this.setState({
      show: false,
      selectedTags: [],
      searchValue: ''
    });
  }

  componentDidUpdate(prevProps: IFilterMetadataProps): void {
    if (prevProps !== this.props) {
      this.setState(state => ({
        selectedTags: state.selectedTags
          .filter(tag => this.props.tags.includes(tag))
          .sort()
      }));
    }
  }

  createFilterBox(): void {
    const filterOption = document.querySelector(
      `#${this.props.namespaceId} .${FILTER_OPTION}`
    );

    filterOption?.classList.toggle('idle');

    this.filterMetadata();
  }

  renderTags(): JSX.Element {
    if (!this.props.tags.length) {
      return (
        <div className={FILTER_TAGS}>
          <p className={FILTER_EMPTY}>No tags defined</p>
        </div>
      );
    }
    return (
      <div className={FILTER_TAGS}>
        {this.props.tags.sort().map((tag: string, index: number) => {
          if (this.state.selectedTags.includes(tag)) {
            return this.renderAppliedTag(tag, index.toString());
          } else {
            return this.renderUnappliedTag(tag, index.toString());
          }
        })}
      </div>
    );
  }

  renderAppliedTag(tag: string, index: string): JSX.Element {
    return (
      <button
        className={`${FILTER_TAG} tag applied-tag`}
        id={'filter' + '-' + tag + '-' + index}
        key={'filter' + '-' + tag + '-' + index}
        title={tag}
        onClick={this.handleClick}
      >
        <span className={FILTER_TAG_LABEL}>{tag}</span>
        <checkIcon.react
          className={FILTER_CHECK}
          tag="span"
          elementPosition="center"
          height="18px"
          width="18px"
          marginLeft="5px"
          marginRight="-3px"
        />
      </button>
    );
  }

  renderUnappliedTag(tag: string, index: string): JSX.Element {
    return (
      <button
        className={`${FILTER_TAG} tag unapplied-tag`}
        id={'filter' + '-' + tag + '-' + index}
        key={'filter' + '-' + tag + '-' + index}
        title={tag}
        onClick={this.handleClick}
      >
        <span className={FILTER_TAG_LABEL}>{tag}</span>
      </button>
    );
  }

  handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    const target = event.target as HTMLElement;
    const clickedTag = target.textContent ?? '';

    this.setState(
      state => ({
        selectedTags: this.updateTagsCss(target, state.selectedTags, clickedTag)
      }),
      this.filterMetadata
    );
  }

  updateTagsCss(
    target: HTMLElement,
    currentTags: string[],
    clickedTag: string
  ): string[] {
    if (target.classList.contains('unapplied-tag')) {
      target.classList.replace('unapplied-tag', 'applied-tag');

      currentTags.splice(-1, 0, clickedTag);
    } else if (target.classList.contains('applied-tag')) {
      target.classList.replace('applied-tag', 'unapplied-tag');

      const idx = currentTags.indexOf(clickedTag);
      currentTags.splice(idx, 1);
    }
    return currentTags.sort();
  }

  handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ searchValue: event.target.value }, this.filterMetadata);
  };

  filterMetadata(): void {
    const isTagFilterOpen = document
      .querySelector(`#${this.props.namespaceId} .${FILTER_OPTION}`)
      ?.classList.contains('idle');
    this.props.onFilter(
      this.state.searchValue,
      isTagFilterOpen ? [] : this.state.selectedTags
    );
  }

  renderFilterOption(): JSX.Element {
    return <div className={`${FILTER_OPTION} idle`}>{this.renderTags()}</div>;
  }

  render(): JSX.Element {
    return (
      <div className={FILTER_TOOLS}>
        <div className={FILTER_SEARCHBAR}>
          <InputGroup
            className={FILTER_SEARCHWRAPPER}
            type="text"
            placeholder="Search..."
            onChange={this.handleSearch}
            rightIcon="ui-components:search"
            value={this.state.searchValue}
          />
        </div>
        <div className={FILTER_CLASS} id={this.props.namespaceId}>
          <button
            title="Filter by tag"
            className={FILTER_BUTTON}
            onClick={this.createFilterBox}
          >
            <tagIcon.react />
          </button>
          {this.renderFilterOption()}
        </div>
      </div>
    );
  }
}
