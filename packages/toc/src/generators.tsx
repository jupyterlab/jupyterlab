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
import { ExperimentalCodeComponent } from './codemirror';

import {
  createDropdownMenu
  // DropdownItem,
  // TagTypeDropdownItem
} from './plugins';

import * as React from 'react';

import { TagsToolComponent } from './tagstool';

const VDOM_MIME_TYPE = 'application/vdom.v1+json';

const HTML_MIME_TYPE = 'text/html';

export interface INotebookHeading extends IHeading {
  numbering?: string | null;
  type: string;
  prompt?: string;
  cellRef?: Cell;
  hasChild?: boolean;
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

  set showMarkdown(value: boolean) {
    this._showMarkdown = value;
    this._widget.notebookMetadata = ['toc-showmarkdowntxt', this._showMarkdown];
    this._widget.update();
  }

  get showMarkdown() {
    return this._showMarkdown;
  }

  set showTags(value: boolean) {
    this._showTags = value;
    this._widget.notebookMetadata = ['toc-showtags', this._showTags];
    this._widget.update();
  }

  get showTags() {
    return this._showTags;
  }

  updateWidget() {
    this._widget.update();
  }

  // initialize options, will NOT change notebook metadata
  initializeOptions(
    numbering: boolean,
    showCode: boolean,
    showMarkdown: boolean,
    showTags: boolean
  ) {
    this._numbering = numbering;
    this._showCode = showCode;
    this._showMarkdown = showMarkdown;
    this._showTags = showTags;
    this._widget.update();
  }

  sanitizer: ISanitizer;
  private _numbering: boolean;
  private _showCode = false;
  private _showMarkdown = false;
  private _showTags = false;
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
    const paddingLeft = 24;
    const collapseOnClick = (cellRef?: Cell) => {
      let collapsed = cellRef!.model.metadata.get(
        'toc-hr-collapsed'
      ) as boolean;
      collapsed = collapsed != undefined ? collapsed : false;
      cellRef!.model.metadata.set('toc-hr-collapsed', !collapsed);
      options.updateWidget();
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
          className={item.type + '-cell'}
          style={{ fontSize, paddingLeft }}
        />
      );
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        collapsed = collapsed != undefined ? collapsed : false;
        let twistButton = (
          <div
            className="toc-collapse-button"
            onClick={event => {
              event.stopPropagation();
              collapseOnClick(item.cellRef);
            }}
          >
            <div className="toc-twist-placeholder">placeholder</div>
            <img
              className="toc-arrow-img"
              src={require('../static/downarrow.svg')}
            />
          </div>
        );
        if (collapsed) {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <img
                className="toc-arrow-img"
                src={require('../static/rightarrow.svg')}
              />
            </div>
          );
        }
        jsx = (
          <div className="toc-entry-holder">
            {item.hasChild && twistButton}
            {jsx}
          </div>
        );
      }
    } else if (item.type === 'header' || options.showMarkdown) {
      jsx = (
        <span className={item.type + '-cell'} style={{ fontSize, paddingLeft }}>
          {numbering + item.text}
        </span>
      );
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        collapsed = collapsed != undefined ? collapsed : false;
        let twistButton = (
          <div
            className="toc-collapse-button"
            onClick={event => {
              event.stopPropagation();
              collapseOnClick(item.cellRef);
            }}
          >
            <div className="toc-twist-placeholder">placeholder</div>
            <img
              className="toc-arrow-img"
              src={require('../static/downarrow.svg')}
            />
          </div>
        );
        if (collapsed) {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <img
                className="toc-arrow-img"
                src={require('../static/rightarrow.svg')}
              />
            </div>
          );
        }
        jsx = (
          <div className="toc-entry-holder">
            {item.hasChild && twistButton}
            {jsx}
          </div>
        );
      }
    } else {
      jsx = null;
    }
  } else if (item.type === 'code' && options.showCode) {
    jsx = (
      <div className="toc-code-cell-div">
        <div className="toc-code-cell-prompt">{item.prompt}</div>
        <span className={'toc-code-span'}>
          <ExperimentalCodeComponent heading={item} />
        </span>
      </div>
    );
    // } else if (item.type === 'raw' && options.showRaw) {
    //   jsx = (
    //     <div className="toc-code-cell-div">
    //       <span className={'toc-code-span'}>
    //         <CodeComponent code={item.text!} theme="none" />
    //       </span>
    //     </div>
    //   );
  } else {
    jsx = null;
  }
  return jsx;
}

interface NotebookGeneratorToolbarProps {}

interface NotebookGeneratorToolbarState {
  showCode: boolean;
  showMarkdown: boolean;
  showTags: boolean;
  numbering: boolean;
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
      this.state = {
        showCode: true,
        showMarkdown: false,
        showTags: false,
        numbering: true
      };
      if (tracker.currentWidget) {
        tracker.currentWidget.context.ready.then(() => {
          if (tracker.currentWidget) {
            tracker.currentWidget.content.activeCellChanged.connect(() => {
              options.updateWidget();
            });
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
            let _showMarkdown = tracker.currentWidget.model.metadata.get(
              'toc-showmarkdowntxt'
            ) as boolean;
            let showMarkdown =
              _showMarkdown != undefined ? _showMarkdown : options.showMarkdown;
            let _showTags = tracker.currentWidget.model.metadata.get(
              'toc-showtags'
            ) as boolean;
            let showTags =
              _showTags != undefined ? _showTags : options.showTags;
            this.allTags = [];
            options.initializeOptions(
              numbering,
              showCode,
              showMarkdown,
              showTags
            );
            this.setState({
              showCode: options.showCode,
              showMarkdown: options.showMarkdown,
              showTags: options.showTags
            });
          }
        });
      }
    }
    public allTags: string[];
    toggleCode = (component: React.Component) => {
      options.showCode = !options.showCode;
      this.setState({ showCode: options.showCode });
    };

    toggleMarkdown = (component: React.Component) => {
      options.showMarkdown = !options.showMarkdown;
      this.setState({ showMarkdown: options.showMarkdown });
    };

    toggleAutoNumbering = () => {
      options.numbering = !options.numbering;
      this.setState({ numbering: options.numbering });
    };

    toggleTagDropdown = () => {
      options.showTags = !options.showTags;
      this.setState({ showTags: options.showTags });
    };

    addTagIntoAllTagsList(name: string) {
      if (name === '') {
        return;
      } else if (this.allTags == null) {
        this.allTags = [name];
      } else {
        if (this.allTags.indexOf(name) < 0) {
          this.allTags.push(name);
        }
      }
    }

    getTags = () => {
      let notebook = tracker.currentWidget;
      if (notebook) {
        let cells = notebook.model.cells;
        this.allTags = [];
        for (var i = 0; i < cells.length; i++) {
          if (cells.get(i)) {
            let cellMetadata = cells.get(i)!.metadata;
            let cellTagsData = cellMetadata.get('tags') as string[];
            if (cellTagsData) {
              for (var j = 0; j < cellTagsData.length; j++) {
                let name = cellTagsData[j];
                this.addTagIntoAllTagsList(name);
              }
            }
          }
        }
      }
    };

    renderedDropdownMenu: any = createDropdownMenu();

    render() {
      // const DropdownMenu = this.renderedDropdownMenu;
      // const dropDownMenuItems: DropdownItem[] = [
      //   {
      //     id: 0,
      //     props: {
      //       title: 'Code',
      //       selectedByDefault: this.state.showCode,
      //       onClickHandler: this.toggleCode.bind(this)
      //     },
      //     type: TagTypeDropdownItem
      //   },
      //   {
      //     id: 1,
      //     props: {
      //       title: 'Raw',
      //       selectedByDefault: this.state.showRaw,
      //       onClickHandler: this.toggleRaw.bind(this)
      //     },
      //     type: TagTypeDropdownItem
      //   },
      //   {
      //     id: 2,
      //     props: {
      //       title: 'Markdown text',
      //       selectedByDefault: this.state.showMarkdown,
      //       onClickHandler: this.toggleMarkdown.bind(this)
      //     },
      //     type: TagTypeDropdownItem
      //   }
      // ];
      let codeIcon = this.state.showCode ? (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../static/code_selected.svg')}
            className="toc-toolbar-code-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../static/code_unselected.svg')}
            className="toc-toolbar-code-icon toc-toolbar-icon"
          />
        </div>
      );

      let markdownIcon = this.state.showMarkdown ? (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../static/markdown_selected.svg')}
            className="toc-toolbar-markdown-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../static/markdown_unselected.svg')}
            className="toc-toolbar-markdown-icon toc-toolbar-icon"
          />
        </div>
      );

      let numberingIcon = this.state.numbering ? (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => this.toggleAutoNumbering()}
        >
          <img
            alt="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            src={require('../static/autonumbering_selected.svg')}
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => this.toggleAutoNumbering()}
        >
          <img
            alt="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            src={require('../static/autonumbering_unselected.svg')}
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon"
          />
        </div>
      );

      let tagDropdown = <div />;
      let tagIcon = (
        <img
          alt="Show Tag Dropdown"
          title="Show Tag Dropdown"
          src={require('../static/tag_unselected.svg')}
        />
      );
      if (this.state.showTags) {
        this.getTags();
        tagDropdown = (
          <div className={'tag-dropdown'}>
            {' '}
            <TagsToolComponent allTagsList={this.allTags} />{' '}
          </div>
        );
        tagIcon = (
          <img
            alt="Hide Tag Dropdown"
            title="Hide Tag Dropdown"
            src={require('../static/tag_selected.svg')}
          />
        );
      }

      return (
        <div>
          <div className={'toc-toolbar'}>
            {codeIcon}
            {markdownIcon}
            {numberingIcon}
          </div>
          <div
            className={'tag-dropdown-button'}
            onClick={event => this.toggleTagDropdown()}
          >
            {tagIcon}
          </div>
          {tagDropdown}
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
    needNumbering: true,
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
      let currentCollapseLevel = -1;
      let prevHeading: INotebookHeading | null = null;
      each(panel.content.widgets, cell => {
        let collapsed = cell!.model.metadata.get('toc-hr-collapsed') as boolean;
        collapsed = collapsed != undefined ? collapsed : false;
        let model = cell.model;
        // Only parse markdown cells or code cell outputs
        if (model.type === 'code') {
          let executionCountNumber = (cell as CodeCell).model
            .executionCount as number;
          let executionCount =
            executionCountNumber != null
              ? '[' + executionCountNumber + ']: '
              : '[ ]: ';
          // Iterate over the outputs, and parse them if they
          // are rendered markdown or HTML.
          let showCode = true;
          if (widget) {
            showCode = options.showCode;
          }
          if (showCode) {
            let text = (model as CodeCellModel).value.text;
            const onClickFactory = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
                if (tracker && tracker.currentWidget) {
                  let cells = tracker.currentWidget.model.cells;
                  for (let i = 0; i < cells.length; i++) {
                    let currCell = tracker.currentWidget.content.widgets[
                      i
                    ] as Cell;
                    if (cell === currCell) {
                      tracker.currentWidget.content.activeCellIndex = i;
                    }
                  }
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeadings = Private.getCodeCells(
              text,
              onClickFactory,
              numberingDict,
              executionCount,
              lastLevel,
              cell
            );
            if (currentCollapseLevel < 0) {
              headings = headings.concat(renderedHeadings);
            }
            prevHeading = renderedHeadings[0];
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
                if (tracker && tracker.currentWidget) {
                  let cells = tracker.currentWidget.model.cells;
                  for (let i = 0; i < cells.length; i++) {
                    let currCell = tracker.currentWidget.content.widgets[
                      i
                    ] as Cell;
                    if (cell === currCell) {
                      tracker.currentWidget.content.activeCellIndex = i;
                    }
                  }
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let numbering = options.numbering;
            let renderedHeadings = Private.getRenderedHTMLHeadings(
              outputWidget.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              numbering,
              cell
            );
            let renderedHeading = renderedHeadings[0];
            if (renderedHeading.type === 'markdown') {
              if (currentCollapseLevel < 0) {
                headings = headings.concat(renderedHeadings);
              }
            } else if (renderedHeading.type === 'header') {
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              if (
                currentCollapseLevel >= renderedHeading.level ||
                currentCollapseLevel < 0
              ) {
                headings = headings.concat(renderedHeadings);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              }
            }
            prevHeading = renderedHeading;
          }
        } else if (model.type === 'markdown') {
          // If the cell is rendered, generate the ToC items from
          // the HTML. If it is not rendered, generate them from
          // the text of the cell.
          if (
            (cell as MarkdownCell).rendered &&
            !(cell as MarkdownCell).inputHidden
          ) {
            const onClickFactory = (el: Element) => {
              return () => {
                if (!(cell as MarkdownCell).rendered) {
                  cell.node.scrollIntoView();
                } else {
                  el.scrollIntoView();
                  if (tracker && tracker.currentWidget) {
                    let cells = tracker.currentWidget.model.cells;
                    for (let i = 0; i < cells.length; i++) {
                      let currCell = tracker.currentWidget.content.widgets[
                        i
                      ] as Cell;
                      if (cell === currCell) {
                        tracker.currentWidget.content.activeCellIndex = i;
                      }
                    }
                  }
                }
              };
            };
            let numbering = options.numbering;
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeadings = Private.getRenderedHTMLHeadings(
              cell.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              numbering,
              cell
            );
            let renderedHeading = renderedHeadings[0];
            if (renderedHeading.type === 'markdown') {
              if (currentCollapseLevel < 0) {
                headings = headings.concat(renderedHeadings);
              }
            } else if (renderedHeading.type === 'header') {
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              if (
                currentCollapseLevel >= renderedHeading.level ||
                currentCollapseLevel < 0
              ) {
                headings = headings.concat(renderedHeadings);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              }
            }
            prevHeading = renderedHeading;
          } else {
            const onClickFactory = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
                if (!(cell as MarkdownCell).rendered) {
                  cell.editor.setCursorPosition({ line, column: 0 });
                }
                if (tracker && tracker.currentWidget) {
                  let cells = tracker.currentWidget.model.cells;
                  for (let i = 0; i < cells.length; i++) {
                    let currCell = tracker.currentWidget.content.widgets[
                      i
                    ] as Cell;
                    if (cell === currCell) {
                      tracker.currentWidget.content.activeCellIndex = i;
                    }
                  }
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeadings = Private.getMarkdownHeadings(
              model.value.text,
              onClickFactory,
              numberingDict,
              lastLevel,
              cell
            );
            let renderedHeading = renderedHeadings[0];
            if (renderedHeading.type === 'markdown') {
              if (currentCollapseLevel < 0) {
                headings = headings.concat(renderedHeadings);
              }
            } else if (renderedHeading.type === 'header') {
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              if (
                currentCollapseLevel >= renderedHeading.level ||
                currentCollapseLevel < 0
              ) {
                headings = headings.concat(renderedHeadings);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              }
            }
          }
        }
      });
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
        cellRef: cellRef,
        hasChild: true
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
        cellRef: cellRef,
        hasChild: true
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
        cellRef: cellRef,
        hasChild: true
      });
    } else {
      headings.push({
        text: line,
        level: lastLevel + 1,
        onClick,
        type: 'markdown',
        cellRef: cellRef,
        hasChild: false
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
        prompt: executionCount,
        cellRef: cellRef,
        hasChild: false
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
        cellRef: cellRef,
        hasChild: false
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
            cellRef: cellRef,
            hasChild: true
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
          cellRef: cellRef,
          hasChild: true
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
