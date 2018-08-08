// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IInstanceTracker, ISanitizer } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel, MarkdownCell, Cell } from '@jupyterlab/cells';

import { IDocumentWidget, MimeDocument } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { each } from '@phosphor/algorithm';

import { TableOfContentsRegistry } from './registry';

import { IHeading, TableOfContents } from './toc';
import { CodeComponent } from './codemirror';

import {
  createDropdownMenu,
  DropdownItem,
  TagTypeDropdownItem
} from './plugins';

import * as React from 'react';

const VDOM_MIME_TYPE = 'application/vdom.v1+json';

const HTML_MIME_TYPE = 'text/html';

interface INotebookHeading extends IHeading {
  numbering?: string | null;
  type: string;
  prompt?: string;
  cellRef?: Cell;
}

class NotebookGeneratorOptionsManager extends TableOfContentsRegistry.IGeneratorOptionsManager {
  constructor(
    widget: TableOfContents,
    notebook: INotebookTracker,
    options: { needNumbering: boolean; sanitizer: ISanitizer }
  ) {
    super();
    this._numbering = options.needNumbering;
    this._widget = widget;
    this._notebook = notebook;
    this.sanitizer = options.sanitizer;
  }

  private changeNumberingStateForAllCells(showNumbering: boolean) {
    if (this._notebook.currentWidget) {
      each(this._notebook.currentWidget.content.widgets, cell => {
        let headingNodes = cell.node.querySelectorAll('h1, h2, h3, h4, h5, h6');
        each(headingNodes, heading => {
          if (heading.getElementsByClassName('numbering-entry').length > 0) {
            if (!showNumbering) {
              heading
                .getElementsByClassName('numbering-entry')[0]
                .setAttribute('hidden', 'true');
            } else {
              heading
                .getElementsByClassName('numbering-entry')[0]
                .removeAttribute('hidden');
            }
          }
        });
      });
    }
  }

  set numbering(value: boolean) {
    this._numbering = value;
    this._widget.update();
    this._widget.notebookMetadata = ['toc-autonumbering', this._numbering];
    this.changeNumberingStateForAllCells(this._numbering);
  }

  get numbering() {
    return this._numbering;
  }

  set showCode(value: boolean) {
    this._showCode = value;
    this._widget.notebookMetadata = ['toc-showcode', this._showCode];
    this._widget.update();
  }

  get showCode() {
    return this._showCode;
  }

  set showRaw(value: boolean) {
    this._showRaw = value;
    this._widget.notebookMetadata = ['toc-showraw', this._showRaw];
    this._widget.update();
  }

  get showRaw() {
    return this._showRaw;
  }

  set showMarkdown(value: boolean) {
    this._showMarkdown = value;
    this._widget.notebookMetadata = ['toc-showmarkdowntxt', this._showMarkdown];
    this._widget.update();
  }

  get showMarkdown() {
    return this._showMarkdown;
  }

  // initialize options, will NOT change notebook metadata
  initializeOptions(
    numbering: boolean,
    showCode: boolean,
    showRaw: boolean,
    showMarkdown: boolean
  ) {
    this._numbering = numbering;
    this._showCode = showCode;
    this._showRaw = showRaw;
    this._showMarkdown = showMarkdown;
    this._widget.update();
  }

  sanitizer: ISanitizer;
  private _numbering: boolean;
  private _showCode = false;
  private _showRaw = false;
  private _showMarkdown = false;
  private _notebook: INotebookTracker;
  private _widget: TableOfContents;
}

function notebookItemRenderer(
  options: NotebookGeneratorOptionsManager,
  item: INotebookHeading
) {
  const levelsSizes: { [level: number]: string } = {
    1: '18.74',
    2: '16.02',
    3: '13.69',
    4: '12',
    5: '11',
    6: '10'
  };
  let jsx;
  if (item.type === 'markdown' || item.type === 'header') {
    const paddingLeft = 22;
    const collapseOnClick = (cellRef?: Cell) => {
      console.log(cellRef!.model.value.text);
    };
    let fontSize = '9px';
    let numbering = item.numbering && options.numbering ? item.numbering : '';
    if (item.type === 'header') {
      fontSize = levelsSizes[item.level] + 'px';
    }
    if (item.html && (item.type === 'header' || options.showMarkdown)) {
      jsx = (
        <span
          dangerouslySetInnerHTML={{
            __html:
              numbering +
              options.sanitizer.sanitize(item.html, Private.sanitizerOptions)
          }}
          className="markdown-cell"
          style={{ fontSize, paddingLeft }}
        />
      );
      if (item.type === 'header') {
        jsx = (
          <div>
            <button
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              CL
            </button>
            {jsx}
          </div>
        );
      }
    } else if (item.type === 'header' || options.showMarkdown) {
      jsx = (
        <span className="markdown-cell" style={{ fontSize, paddingLeft }}>
          {numbering + item.text}
        </span>
      );
      if (item.type === 'header') {
        jsx = (
          <div>
            <button>CL</button>
            {jsx}
          </div>
        );
      }
    } else {
      jsx = <div />;
    }
  } else if (item.type === 'code' && options.showCode) {
    jsx = (
      <div className="toc-code-cell-div">
        <div className="toc-code-cell-prompt">{item.prompt}</div>
        <span className={'toc-code-span'}>
          <CodeComponent code={item.text!} theme="jupyter" />
        </span>
      </div>
    );
  } else if (item.type === 'raw' && options.showRaw) {
    jsx = (
      <div className="toc-code-cell-div">
        <span className={'toc-code-span'}>
          <CodeComponent code={item.text!} theme="none" />
        </span>
      </div>
    );
  } else {
    jsx = <div />;
  }
  return jsx;
}

interface NotebookGeneratorToolbarProps {}

interface NotebookGeneratorToolbarState {
  showCode: boolean;
  showRaw: boolean;
  showMarkdown: boolean;
}

export function notebookGeneratorToolbar(
  options: NotebookGeneratorOptionsManager,
  tracker: INotebookTracker
) {
  return class extends React.Component<
    NotebookGeneratorToolbarProps,
    NotebookGeneratorToolbarState
  > {
    constructor(props: NotebookGeneratorToolbarProps) {
      super(props);
      this.state = { showCode: true, showRaw: false, showMarkdown: false };
      if (tracker.currentWidget) {
        tracker.currentWidget.context.ready.then(() => {
          if (tracker.currentWidget) {
            let _numbering = tracker.currentWidget.model.metadata.get(
              'toc-autonumbering'
            ) as boolean;
            let numbering =
              _numbering != undefined ? _numbering : options.numbering;
            let _showCode = tracker.currentWidget.model.metadata.get(
              'toc-showcode'
            ) as boolean;
            let showCode =
              _showCode != undefined ? _showCode : options.showCode;
            let _showRaw = tracker.currentWidget.model.metadata.get(
              'toc-showraw'
            ) as boolean;
            let showRaw = _showRaw != undefined ? _showRaw : options.showRaw;
            let _showMarkdown = tracker.currentWidget.model.metadata.get(
              'toc-showmarkdowntxt'
            ) as boolean;
            let showMarkdown =
              _showMarkdown != undefined ? _showMarkdown : options.showMarkdown;
            options.initializeOptions(
              numbering,
              showCode,
              showRaw,
              showMarkdown
            );
            this.setState({
              showCode: options.showCode,
              showRaw: options.showRaw,
              showMarkdown: options.showMarkdown
            });
          }
        });
      }
    }
    toggleCode = (component: React.Component) => {
      options.showCode = !options.showCode;
      this.setState({ showCode: options.showCode });
    };

    toggleRaw = (component: React.Component) => {
      options.showRaw = !options.showRaw;
      this.setState({ showRaw: options.showRaw });
    };

    toggleMarkdown = (component: React.Component) => {
      options.showMarkdown = !options.showMarkdown;
      this.setState({ showMarkdown: options.showMarkdown });
    };

    toggleAutoNumbering = () => {
      options.numbering = !options.numbering;
    };

    renderedDropdownMenu: any = createDropdownMenu();

    render() {
      const DropdownMenu = this.renderedDropdownMenu;
      const dropDownMenuItems: DropdownItem[] = [
        {
          id: 0,
          props: {
            title: 'Code',
            selectedByDefault: this.state.showCode,
            onClickHandler: this.toggleCode.bind(this)
          },
          type: TagTypeDropdownItem
        },
        {
          id: 1,
          props: {
            title: 'Raw',
            selectedByDefault: this.state.showRaw,
            onClickHandler: this.toggleRaw.bind(this)
          },
          type: TagTypeDropdownItem
        },
        {
          id: 2,
          props: {
            title: 'Markdown text',
            selectedByDefault: this.state.showMarkdown,
            onClickHandler: this.toggleMarkdown.bind(this)
          },
          type: TagTypeDropdownItem
        }
      ];

      return (
        <div className="toc-toolbar">
          <DropdownMenu
            className="celltypes-dropdown"
            items={{
              stateIndicator: '',
              items: dropDownMenuItems
            }}
            buttonTitle={
              <span>
                Cell Type
                <img
                  className="dropdown-arrow"
                  src={require('../static/menu_arrow.svg')}
                />
              </span>
            }
          />
          <div
            className="auto-numbering-button"
            onClick={event => this.toggleAutoNumbering()}
          >
            <img
              alt="Toggle Auto-Numbering"
              title="Toggle Auto-Numbering"
              src={require('../static/numbering.svg')}
              className="numberingIcon"
            />
          </div>
        </div>
      );
    }
  };
}

/**
 * Create a TOC generator for notebooks.
 *
 * @param tracker: A notebook tracker.
 *
 * @returns A TOC generator that can parse notebooks.
 */
export function createNotebookGenerator(
  tracker: INotebookTracker,
  sanitizer: ISanitizer,
  widget: TableOfContents
): TableOfContentsRegistry.IGenerator<NotebookPanel> {
  const options = new NotebookGeneratorOptionsManager(widget, tracker, {
    needNumbering: false,
    sanitizer: sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: () => {
      return notebookGeneratorToolbar(options, tracker);
    },
    itemRenderer: (item: INotebookHeading) => {
      return notebookItemRenderer(options, item);
    },
    generate: panel => {
      let headings: INotebookHeading[] = [];
      let numberingDict: { [level: number]: number } = {};
      each(panel.content.widgets, cell => {
        let model = cell.model;
        // Only parse markdown cells or code cell outputs
        if (model.type === 'code') {
          let executionCount = cell.node.getElementsByClassName(
            'jp-InputArea-prompt'
          )[0].innerHTML;
          // Iterate over the outputs, and parse them if they
          // are rendered markdown or HTML.
          let showCode = true;
          if (widget) {
            showCode = options.showCode;
          }
          if (showCode) {
            let text = (model as CodeCellModel).value.text;
            const onClickFactory2 = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            headings = headings.concat(
              Private.getCodeCells(
                text,
                onClickFactory2,
                numberingDict,
                executionCount,
                lastLevel,
                cell
              )
            );
          }
          for (let i = 0; i < (model as CodeCellModel).outputs.length; i++) {
            // Filter out the outputs that are not rendered HTML
            // (that is, markdown, vdom, or text/html)
            const outputModel = (model as CodeCellModel).outputs.get(i);
            const dataTypes = Object.keys(outputModel.data);
            const htmlData = dataTypes.filter(
              t => Private.isMarkdown(t) || Private.isDOM(t)
            );
            if (!htmlData.length) {
              continue;
            }
            // If the output has rendered HTML, parse it for headers.
            const outputWidget = (cell as CodeCell).outputArea.widgets[i];
            const onClickFactory = (el: Element) => {
              return () => {
                el.scrollIntoView();
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let numbering = options.numbering;
            headings = headings.concat(
              Private.getRenderedHTMLHeadings(
                outputWidget.node,
                onClickFactory,
                sanitizer,
                numberingDict,
                lastLevel,
                numbering,
                cell
              )
            );
          }
        } else if (model.type === 'markdown') {
          // If the cell is rendered, generate the ToC items from
          // the HTML. If it is not rendered, generate them from
          // the text of the cell.
          if ((cell as MarkdownCell).rendered) {
            const onClickFactory = (el: Element) => {
              return () => {
                if (!(cell as MarkdownCell).rendered) {
                  cell.node.scrollIntoView();
                } else {
                  el.scrollIntoView();
                }
              };
            };
            let numbering = options.numbering;
            let lastLevel = Private.getLastLevel(headings);
            headings = headings.concat(
              Private.getRenderedHTMLHeadings(
                cell.node,
                onClickFactory,
                sanitizer,
                numberingDict,
                lastLevel,
                numbering,
                cell
              )
            );
          } else {
            const onClickFactory = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
                if (!(cell as MarkdownCell).rendered) {
                  cell.editor.setCursorPosition({ line, column: 0 });
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            headings = headings.concat(
              Private.getMarkdownHeadings(
                model.value.text,
                onClickFactory,
                numberingDict,
                lastLevel,
                cell
              )
            );
          }
        } else if (model.type === 'raw') {
          let showRaw = false;
          if (widget) {
            showRaw = options.showRaw;
          }
          if (showRaw) {
            let text = (model as CodeCellModel).value.text;
            const onClickFactory2 = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            headings = headings.concat(
              Private.getRawCells(
                text,
                onClickFactory2,
                numberingDict,
                lastLevel,
                cell
              )
            );
          }
        }
      });
      // for (let i = 0; i < headings.length - 1; i++) {
      //   if (headings[i + 1].level < headings[i].level) {
      //     console.log('has a child!');
      //   }
      // }
      return headings;
    }
  };
}

/**
 * Create a TOC generator for markdown files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse markdown files.
 */
export function createMarkdownGenerator(
  tracker: IEditorTracker
): TableOfContentsRegistry.IGenerator<IDocumentWidget<FileEditor>> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return Private.isMarkdown(editor.content.model.mimeType);
    },
    generate: editor => {
      let model = editor.content.model;
      let onClickFactory = (line: number) => {
        return () => {
          editor.content.editor.setCursorPosition({ line, column: 0 });
        };
      };
      return Private.getMarkdownDocHeadings(
        model.value.text,
        onClickFactory,
        null
      );
    }
  };
}

/**
 * Create a TOC generator for rendered markdown files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse markdown files.
 */
export function createRenderedMarkdownGenerator(
  tracker: IInstanceTracker<MimeDocument>,
  sanitizer: ISanitizer
): TableOfContentsRegistry.IGenerator<MimeDocument> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: widget => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return Private.isMarkdown(widget.content.mimeType);
    },
    generate: widget => {
      const onClickFactory = (el: Element) => {
        return () => {
          el.scrollIntoView();
        };
      };
      return Private.getRenderedHTMLHeadings(
        widget.content.node,
        onClickFactory,
        sanitizer,
        null,
        0
      );
    }
  };
}

/**
 * Create a TOC generator for LaTeX files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse LaTeX files.
 */
export function createLatexGenerator(
  tracker: IEditorTracker
): TableOfContentsRegistry.IGenerator<IDocumentWidget<FileEditor>> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few LaTeX variants.
      let mime = editor.content.model.mimeType;
      return mime === 'text/x-latex' || mime === 'text/x-stex';
    },
    generate: editor => {
      let headings: IHeading[] = [];
      let model = editor.content.model;

      // Split the text into lines, with the line number for each.
      // We will use the line number to scroll the editor upon
      // TOC item click.
      const lines = model.value.text.split('\n').map((value, idx) => {
        return { value, idx };
      });

      // Iterate over the lines to get the header level and
      // the text for the line.
      lines.forEach(line => {
        const match = line.value.match(
          /^\s*\\(section|subsection|subsubsection){(.+)}/
        );
        if (match) {
          const level = Private.latexLevels[match[1]];
          const text = match[2];
          const onClick = () => {
            editor.content.editor.setCursorPosition({
              line: line.idx,
              column: 0
            });
          };
          // TODO: HEADER!!!
          // headings.push({ text, level, onClick, type: 'heading' });
          headings.push({ text, level, onClick });
        }
      });
      return headings;
    }
  };
}

/**
 * A private namespace for miscellaneous things.
 */
namespace Private {
  export function getLastLevel(headings: INotebookHeading[]) {
    if (headings.length > 0) {
      let location = headings.length - 1;
      while (location >= 0) {
        if (headings[location].type === 'header') {
          return headings[location].level;
        }
        location = location - 1;
      }
    }
    return 0;
  }

  export function incrementNumberingDict(dict: any, level: number) {
    if (dict[level + 1] != undefined) {
      dict[level + 1] = undefined;
    }
    if (dict[level] === undefined) {
      dict[level] = 1;
    } else {
      dict[level]++;
    }
  }

  export function generateNumbering(numberingDict: any, level: number) {
    let numbering = undefined;
    if (numberingDict != null) {
      Private.incrementNumberingDict(numberingDict, level);
      numbering = '';
      for (var j = 1; j <= level; j++) {
        numbering +=
          (numberingDict[j] == undefined ? '0' : numberingDict[j]) + '.';
        if (j == level) {
          numbering += ' ';
        }
      }
    }
    return numbering;
  }

  export function getMarkdownDocHeadings(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any
  ): INotebookHeading[] {
    // Split the text into lines.
    const lines = text.split('\n');
    let headings: INotebookHeading[] = [];

    // Iterate over the lines to get the header level and
    // the text for the line.
    lines.forEach((line, idx) => {
      // Make an onClick handler for this line.
      const onClick = onClickFactory(idx);

      // First test for '#'-style headers.
      let match = line.match(/^([#]{1,6}) (.*)/);
      if (match) {
        const level = match[1].length;
        // Take special care to parse markdown links into raw text.
        const text = match[2].replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = Private.generateNumbering(numberingDict, level);
        // TODO: HEADER!!!
        headings.push({ text, numbering, level, onClick, type: 'header' });
        return;
      }

      // Next test for '==='-style headers.
      match = line.match(/^([=]{2,}|[-]{2,})/);
      if (match && idx > 0) {
        const level = match[1][0] === '=' ? 1 : 2;
        // Take special care to parse markdown links into raw text.
        const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = Private.generateNumbering(numberingDict, level);
        // TODO: HEADER!!!
        headings.push({ text, numbering, level, onClick, type: 'header' });
        return;
      }

      // Finally test for HTML headers. This will not catch multiline
      // headers, nor will it catch multiple headers on the same line.
      // It should do a decent job of catching many, though.
      match = line.match(/<h([1-6])>(.*)<\/h\1>/i);
      if (match) {
        const level = parseInt(match[1], 10);
        const text = match[2];
        let numbering = Private.generateNumbering(numberingDict, level);
        // TODO: HEADER!!!
        headings.push({ text, numbering, level, onClick, type: 'header' });
        return;
      }
    });
    return headings;
  }

  /**
   * Given a string of markdown, get the markdown headings
   * in that string.
   */
  export function getMarkdownHeadings(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading[] {
    // Split the text into lines.
    const lines = text.split('\n');
    let headings: INotebookHeading[] = [];
    // Iterate over the lines to get the header level and
    // the text for the line.
    let line = lines[0];
    let idx = 0;
    // Make an onClick handler for this line.
    const onClick = onClickFactory(idx);

    // First test for '#'-style headers.
    let match = line.match(/^([#]{1,6}) (.*)/);
    let match2 = line.match(/^([=]{2,}|[-]{2,})/);
    let match3 = line.match(/<h([1-6])>(.*)<\/h\1>/i);
    if (match) {
      const level = match[1].length;
      // Take special care to parse markdown links into raw text.
      const text = match[2].replace(/\[(.+)\]\(.+\)/g, '$1');
      let numbering = Private.generateNumbering(numberingDict, level);
      // TODO: HEADER!!!
      headings.push({
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef
      });
    }

    // Next test for '==='-style headers.
    else if (match2 && idx > 0) {
      const level = match2[1][0] === '=' ? 1 : 2;
      // Take special care to parse markdown links into raw text.
      const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
      let numbering = Private.generateNumbering(numberingDict, level);
      // TODO: HEADER!!!
      headings.push({
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef
      });
    }

    // Finally test for HTML headers. This will not catch multiline
    // headers, nor will it catch multiple headers on the same line.
    // It should do a decent job of catching many, though.
    else if (match3) {
      const level = parseInt(match3[1], 10);
      const text = match3[2];
      let numbering = Private.generateNumbering(numberingDict, level);
      // TODO: HEADER!!!
      headings.push({
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef
      });
    } else {
      headings.push({
        text: line,
        level: lastLevel + 1,
        onClick,
        type: 'markdown',
        cellRef: cellRef
      });
    }
    return headings;
  }

  export function getCodeCells(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any,
    executionCount: string,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    if (text) {
      const lines = text.split('\n');
      let headingText = '';
      let numLines = Math.min(lines.length, 10);
      for (let i = 0; i < numLines - 1; i++) {
        headingText = headingText + lines[i] + '\n';
      }
      headingText = headingText + lines[numLines - 1];
      const onClick = onClickFactory(0);
      const level = lastLevel + 1;
      headings.push({
        text: headingText,
        level,
        onClick,
        type: 'code',
        prompt: executionCount.substring(3),
        cellRef: cellRef
      });
    }
    return headings;
  }

  export function getRawCells(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    if (text) {
      const lines = text.split('\n');
      let headingText = '';
      let numLines = Math.min(lines.length, 10);
      for (let i = 0; i < numLines - 1; i++) {
        headingText = headingText + lines[i] + '\n';
      }
      headingText = headingText + lines[numLines - 1];
      const onClick = onClickFactory(0);
      const level = lastLevel + 1;
      headings.push({
        text: headingText,
        level,
        onClick,
        type: 'raw',
        cellRef: cellRef
      });
    }
    return headings;
  }
  /**
   * Given an HTML element, generate ToC headings
   * by finding all the headers and making IHeading objects for them.
   */
  export function getRenderedHTMLHeadings(
    node: HTMLElement,
    onClickFactory: (el: Element) => (() => void),
    sanitizer: ISanitizer,
    numberingDict: any,
    lastLevel: number,
    needNumbering = false,
    cellRef?: Cell
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    if (headingNodes.length > 0) {
      let markdownCell = headingNodes[0];
      if (markdownCell.nodeName.toLowerCase() === 'p') {
        if (markdownCell.innerHTML) {
          headings.push({
            level: lastLevel + 1,
            html: markdownCell.innerHTML,
            text: markdownCell.textContent,
            onClick: onClickFactory(markdownCell),
            type: 'markdown',
            cellRef: cellRef
          });
        }
      } else {
        const heading = headingNodes[0];
        const level = parseInt(heading.tagName[1]);
        const text = heading.textContent;
        let shallHide = !needNumbering;
        if (heading.getElementsByClassName('numbering-entry').length > 0) {
          heading.removeChild(
            heading.getElementsByClassName('numbering-entry')[0]
          );
        }
        let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
        html = html.replace('¶', ''); // Remove the anchor symbol.
        const onClick = onClickFactory(heading);
        let numbering = Private.generateNumbering(numberingDict, level);
        let numberingElement =
          '<span class="numbering-entry" ' +
          (shallHide ? ' hidden="true"' : '') +
          '>' +
          numbering +
          '</span>';
        heading.innerHTML = numberingElement + html;
        // TODO: HEADER!!! (type: header)
        headings.push({
          level,
          text,
          numbering,
          html,
          onClick,
          type: 'header',
          cellRef: cellRef
        });
      }
    }
    return headings;
  }

  /**
   * Return whether the mime type is some flavor of markdown.
   */
  export function isMarkdown(mime: string): boolean {
    return (
      mime === 'text/x-ipythongfm' ||
      mime === 'text/x-markdown' ||
      mime === 'text/x-gfm' ||
      mime === 'text/markdown'
    );
  }

  /**
   * Return whether the mime type is DOM-ish (html or vdom).
   */
  export function isDOM(mime: string): boolean {
    return mime === VDOM_MIME_TYPE || mime === HTML_MIME_TYPE;
  }

  /**
   * A mapping from LaTeX section headers to HTML header
   * levels. `part` and `chapter` are less common in my experience,
   * so assign them to header level 1.
   */
  export const latexLevels: { [label: string]: number } = {
    part: 1, // Only available for report and book classes
    chapter: 1, // Only available for report and book classes
    section: 1,
    subsection: 2,
    subsubsection: 3,
    paragraph: 4,
    subparagraph: 5
  };

  /**
   * Allowed HTML tags for the ToC entries. We use this to
   * sanitize HTML headings, if they are given. We specifically
   * disallow anchor tags, since we are adding our own.
   */
  export const sanitizerOptions = {
    allowedTags: [
      'p',
      'blockquote',
      'b',
      'i',
      'strong',
      'em',
      'strike',
      'code',
      'br',
      'div',
      'span',
      'pre',
      'del'
    ],
    allowedAttributes: {
      // Allow "class" attribute for <code> tags.
      code: ['class'],
      // Allow "class" attribute for <span> tags.
      span: ['class'],
      // Allow "class" attribute for <div> tags.
      div: ['class'],
      // Allow "class" attribute for <p> tags.
      p: ['class'],
      // Allow "class" attribute for <pre> tags.
      pre: ['class']
    }
  };
}
