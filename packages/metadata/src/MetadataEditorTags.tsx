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
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { checkIcon, addIcon } from '@jupyterlab/ui-components';

import React from 'react';

interface IMetadataEditorTagProps {
  selectedTags: string[];
  tags: string[];
  handleChange: (selectedTags: string[], allTags: string[]) => void;
}

interface IMetadataEditorTagState {
  selectedTags: string[];
  tags: string[];
  plusIconShouldHide: boolean;
  addingNewTag: boolean;
}

/**
 * CSS STYLING
 */
const METADATA_EDITOR_TAG = 'elyra-editor-tag';
const METADATA_EDITOR_TAG_PLUS_ICON = 'elyra-editor-tag-plusIcon';
const METADATA_EDITOR_TAG_LIST = 'elyra-editor-tagList';
const METADATA_EDITOR_INPUT_TAG = 'elyra-inputTag';

export class MetadataEditorTags extends React.Component<
  IMetadataEditorTagProps,
  IMetadataEditorTagState
> {
  constructor(props: IMetadataEditorTagProps) {
    super(props);
    this.state = {
      selectedTags: [],
      tags: [],
      plusIconShouldHide: false,
      addingNewTag: false
    };
    this.renderTags = this.renderTags.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount(): void {
    this.setState({
      selectedTags: this.props.selectedTags ? this.props.selectedTags : [],
      tags: this.props.tags ? this.props.tags.sort() : [],
      plusIconShouldHide: false,
      addingNewTag: false
    });
  }

  componentDidUpdate(prevProps: IMetadataEditorTagProps): void {
    if (prevProps !== this.props) {
      this.setState({
        selectedTags: this.props.selectedTags ? this.props.selectedTags : [],
        tags: this.props.tags ? this.props.tags : []
      });
    }
  }

  handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    const target = event.target as HTMLElement;
    const clickedTag = target.innerText;

    this.setState(
      state => ({
        selectedTags: this.updateTagsCss(
          target,
          state.selectedTags ? state.selectedTags : [],
          clickedTag
        )
      }),
      this.handleOnChange
    );
  }

  handleOnChange(): void {
    this.props.handleChange(this.state.selectedTags, this.state.tags);
  }

  updateTagsCss(
    target: HTMLElement,
    tags: string[],
    clickedTag: string
  ): string[] {
    const currentTags = tags.slice();
    if (target.classList.contains('unapplied-tag')) {
      target.classList.replace('unapplied-tag', 'applied-tag');
      currentTags.splice(-1, 0, clickedTag);
    } else if (target.classList.contains('applied-tag')) {
      target.classList.replace('applied-tag', 'unapplied-tag');

      const idx = currentTags.indexOf(clickedTag);
      currentTags.splice(idx, 1);
    }
    return currentTags;
  }

  addTagOnClick(event: React.MouseEvent<HTMLInputElement>): void {
    this.setState({ plusIconShouldHide: true, addingNewTag: true });
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.value === 'Add Tag') {
      inputElement.value = '';
      inputElement.style.width = '62px';
      inputElement.style.minWidth = '62px';
    }
  }

  async addTagOnKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ): Promise<void> {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.value !== '' && event.keyCode === 13) {
      if (this.state.tags.includes(inputElement.value)) {
        event.preventDefault();
        await showDialog({
          title: 'A tag with this label already exists.',
          buttons: [Dialog.okButton()]
        });
        return;
      }

      const newTag = inputElement.value;

      // update state all tag and selected tag
      this.setState(
        state => ({
          selectedTags: [...state.selectedTags, newTag],
          tags: [...state.tags, newTag],
          plusIconShouldHide: false,
          addingNewTag: false
        }),
        this.handleOnChange
      );
    }
  }

  addTagOnBlur(event: React.FocusEvent<HTMLInputElement>): void {
    const inputElement = event.target as HTMLInputElement;
    inputElement.value = 'Add Tag';
    inputElement.style.width = '50px';
    inputElement.style.minWidth = '50px';
    inputElement.blur();
    this.setState({ plusIconShouldHide: false, addingNewTag: false });
  }

  renderTags(): JSX.Element {
    const hasTags = this.state.tags;
    const inputBox =
      this.state.addingNewTag === true ? (
        <ul
          className={`${METADATA_EDITOR_TAG} tag unapplied-tag`}
          key={'editor-new-tag'}
        >
          <input
            className={`${METADATA_EDITOR_INPUT_TAG}`}
            onClick={(
              event: React.MouseEvent<HTMLInputElement, MouseEvent>
            ): void => this.addTagOnClick(event)}
            onKeyDown={async (
              event: React.KeyboardEvent<HTMLInputElement>
            ): Promise<void> => {
              await this.addTagOnKeyDown(event);
            }}
            onBlur={(event: React.FocusEvent<HTMLInputElement>): void =>
              this.addTagOnBlur(event)
            }
            autoFocus
          />
        </ul>
      ) : (
        <button
          onClick={(): void => this.setState({ addingNewTag: true })}
          className={`${METADATA_EDITOR_TAG} tag unapplied-tag`}
        >
          Add Tag
          <addIcon.react
            tag="span"
            className={METADATA_EDITOR_TAG_PLUS_ICON}
            elementPosition="center"
            height="16px"
            width="16px"
            marginLeft="2px"
          />
        </button>
      );
    return (
      <li className={METADATA_EDITOR_TAG_LIST}>
        {hasTags
          ? this.state.tags.map((tag: string, index: number) =>
              ((): JSX.Element => {
                if (!this.state.selectedTags) {
                  return (
                    <button
                      onClick={this.handleClick}
                      className={`${METADATA_EDITOR_TAG} tag unapplied-tag`}
                      id={'editor' + '-' + tag + '-' + index}
                      key={'editor' + '-' + tag + '-' + index}
                    >
                      {tag}
                    </button>
                  );
                }

                if (this.state.selectedTags.includes(tag)) {
                  return (
                    <button
                      onClick={this.handleClick}
                      className={`${METADATA_EDITOR_TAG} tag applied-tag`}
                      id={'editor' + '-' + tag + '-' + index}
                      key={'editor' + '-' + tag + '-' + index}
                    >
                      {tag}
                      <checkIcon.react
                        tag="span"
                        elementPosition="center"
                        height="18px"
                        width="18px"
                        marginLeft="5px"
                        marginRight="-3px"
                      />
                    </button>
                  );
                } else {
                  return (
                    <button
                      onClick={this.handleClick}
                      className={`${METADATA_EDITOR_TAG} tag unapplied-tag`}
                      id={'editor' + '-' + tag + '-' + index}
                      key={'editor' + '-' + tag + '-' + index}
                    >
                      {tag}
                    </button>
                  );
                }
              })()
            )
          : null}
        {inputBox}
      </li>
    );
  }

  render(): JSX.Element {
    return <div>{this.renderTags()}</div>;
  }
}
