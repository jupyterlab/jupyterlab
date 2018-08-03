// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ActivityMonitor, PathExt } from '@jupyterlab/coreutils';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { Message } from '@phosphor/messaging';

import { each } from '@phosphor/algorithm';

import { Widget } from '@phosphor/widgets';

import { TableOfContentsRegistry } from './registry';

import { CodeComponent } from './codemirror';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { INotebookTracker } from '@jupyterlab/notebook';
import {
  createDropdownMenu,
  DropdownItem,
  TagTypeDropdownItem
} from './plugins';

/**
 * Timeout for throttling TOC rendering.
 */
const RENDER_TIMEOUT = 1000;
const NEED_NUMBERING_BY_DEFAULT = true;

/**
 * A widget for hosting a notebook table-of-contents.
 */
export class TableOfContents extends Widget {
  /**
   * Create a new table of contents.
   */
  constructor(options: TableOfContents.IOptions) {
    super();
    this._docmanager = options.docmanager;
    this._rendermime = options.rendermime;
    this._notebook = options.notebookTracker;
  }

  // filterByTag(name: string) {

  // }

  /**
   * The current widget-generator tuple for the ToC.
   */
  get current(): TableOfContents.ICurrentWidget | null {
    return this._current;
  }
  set current(value: TableOfContents.ICurrentWidget | null) {
    // If they are the same as previously, do nothing.
    if (this._notebook.currentWidget) {
      this._notebook.currentWidget.context.ready.then(() => {
        if (this._notebook.currentWidget) {
          this.needNumbering = this._notebook.currentWidget.model.metadata.get(
            'autoNumberingEnabled'
          ) as boolean;
        }
      });
    }
    if (
      value &&
      this._current &&
      this._current.widget === value.widget &&
      this._current.generator === value.generator
    ) {
      return;
    }
    this._current = value;

    // Dispose an old activity monitor if it existsd
    if (this._monitor) {
      this._monitor.dispose();
      this._monitor = null;
    }
    // If we are wiping the ToC, update and return.
    if (!this._current) {
      this.update();
      return;
    }

    // Find the document model associated with the widget.
    const context = this._docmanager.contextForWidget(this._current.widget);
    if (!context || !context.model) {
      throw Error('Could not find a context for the Table of Contents');
    }

    // Throttle the rendering rate of the table of contents.
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(
      this.update,
      this
    );
    this.update();
  }

  /**
   * Handle an update request.
   */
  protected onUpdateRequest(msg: Message): void {
    // Don't bother if the TOC is not visible
    /* if (!this.isVisible) {
      return;
    } */
    this.updateTOC();
  }

  updateTOC() {
    let toc: IHeading[] = [];
    let title = 'Table of Contents';
    if (this._current) {
      toc = this._current.generator.generate(this._current.widget);
      const context = this._docmanager.contextForWidget(this._current.widget);
      if (context) {
        title = PathExt.basename(context.localPath);
      }
    }
    ReactDOM.render(
      <TOCTree widget={this} title={title} toc={toc} />,
      this.node,
      () => {
        if (
          this._current &&
          this._current.generator.usesLatex === true &&
          this._rendermime.latexTypesetter
        ) {
          this._rendermime.latexTypesetter.typeset(this.node);
        }
      }
    );
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

  /**
   * Rerender after showing.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
    if (this._notebook.currentWidget != null) {
      this._notebook.currentWidget.content.activeCellChanged.connect(() => {
        this.update();
      });
    }
  }

  get needNumbering() {
    return this._needNumbering;
  }

  set needNumbering(value: boolean) {
    this._needNumbering = value;
    if (this._notebook.currentWidget != null) {
      this._notebook.currentWidget.model.metadata.set(
        'autoNumberingEnabled',
        value
      );
    }
    this.changeNumberingStateForAllCells(value);
  }

  private _needNumbering = NEED_NUMBERING_BY_DEFAULT;
  public showCode = true;
  public showRaw = false;
  public showMarkdown = false;
  public menuOpen = false;
  private _notebook: INotebookTracker;
  private _rendermime: IRenderMimeRegistry;
  private _docmanager: IDocumentManager;
  private _current: TableOfContents.ICurrentWidget | null;
  private _monitor: ActivityMonitor<any, any> | null;
}

/**
 * A namespace for TableOfContents statics.
 */
export namespace TableOfContents {
  /**
   * Options for the constructor.
   */
  export interface IOptions {
    /**
     * The document manager for the application.
     */
    docmanager: IDocumentManager;

    /**
     * The rendermime for the application.
     */
    rendermime: IRenderMimeRegistry;
    notebookTracker: INotebookTracker;
  }

  /**
   * A type representing a tuple of a widget,
   * and a generator that knows how to generate
   * heading information from that widget.
   */
  export interface ICurrentWidget<W extends Widget = Widget> {
    widget: W;
    generator: TableOfContentsRegistry.IGenerator<W>;
  }
}

/**
 * An object that represents a heading.
 */
export interface IHeading {
  /**
   * The text of the heading.
   */
  text: string | null;

  /**
   * The HTML header level for the heading.
   */
  level: number;

  numbering?: string | null;

  /**
   * A function to execute when clicking the ToC
   * item. Typically this will be used to scroll
   * the parent widget to this item.
   */
  onClick: () => void;

  /**
   * If there is special markup, we can instead
   * render the heading using a raw HTML string. This
   * HTML *should be properly sanitized!*
   *
   * For instance, this can be used to render
   * already-renderd-to-html markdown headings.
   */
  html?: string | null;
  type: string;
}

/**
 * Props for the TOCTree component.
 */
export interface ITOCTreeProps extends React.Props<TOCTree> {
  /**
   * A title to display.
   */
  title: string;

  /**
   * A list of IHeadings to render.
   */
  toc: IHeading[];
  widget: TableOfContents;
}

/**
 * Props for the TOCItem component.
 */
export interface ITOCItemProps extends React.Props<TOCItem> {
  /**
   * An IHeading to render.
   */
  heading: IHeading;
  needNumbering: boolean;
}

export interface ITOCItemStates {
  needNumbering: boolean;
}

/**
 * A React component for a table of contents entry.
 */
export class TOCItem extends React.Component<ITOCItemProps, ITOCItemStates> {
  constructor(props: ITOCItemProps) {
    super(props);
    this.state = { needNumbering: this.props.needNumbering };
  }

  componentWillReceiveProps(nextProps: ITOCItemProps) {
    this.setState({ needNumbering: nextProps.needNumbering });
  }

  /**
   * Render the item.
   */
  render() {
    const { heading } = this.props;
    let level = Math.round(heading.level);
    // Clamp the header level between 1 and six.
    level = Math.max(Math.min(level, 6), 1);

    const paddingLeft = 4; //(level - 1) * 12;

    // Create an onClick handler for the TOC item
    // that scrolls the anchor into view.
    const handleClick = (event: React.SyntheticEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      heading.onClick();
    };

    let content;
    let numbering =
      heading.numbering && this.state.needNumbering ? heading.numbering : '';
    if (heading.html) {
      content = (
        <span
          dangerouslySetInnerHTML={{ __html: numbering + heading.html }}
          style={{ paddingLeft }}
        />
      );
    } else {
      // let collapse = this.props.children ? (
      //   <img src={require('../static/rightarrow.svg')} />
      // ) : "";
      content = <span style={{ paddingLeft }}>{numbering + heading.text}</span>;
    }

    return <li onClick={handleClick}>{content}</li>;
  }
}

export class TOCCodeCell extends React.Component<
  ITOCItemProps,
  ITOCItemStates
> {
  constructor(props: ITOCItemProps) {
    super(props);
    this.state = { needNumbering: this.props.needNumbering };
  }

  componentWillReceiveProps(nextProps: ITOCItemProps) {
    this.setState({ needNumbering: nextProps.needNumbering });
  }

  /**
   * Render the item.
   */
  render() {
    const { heading } = this.props;
    let level = Math.round(heading.level);
    // Clamp the header level between 1 and six.
    level = Math.max(Math.min(level, 6), 1);

    const paddingLeft = 4; //(level - 1) * 12;

    // Create an onClick handler for the TOC item
    // that scrolls the anchor into view.
    const handleClick = (event: React.SyntheticEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      heading.onClick();
    };
    let content = null;
    let numbering =
      heading.numbering && this.state.needNumbering ? heading.numbering : '';
    let theme = heading.type === 'raw' ? 'none' : 'jupyter';
    if (heading.html) {
      /* console.log("you're not covering this case idiot");
      content = (
        <span
          className={'jp-TableOfContents-code'}
          dangerouslySetInnerHTML={{ __html: numbering + heading.html }}
          style={{ paddingLeft }}
        />
      ); */
      content = (
        <span className={'toc-code-span'} style={{ paddingLeft }}>
          <CodeComponent code={numbering + heading.html} theme={theme} />
        </span>
      );
    } else {
      /* content = (
        <span style={{ paddingLeft }}>
          <pre className={'jp-TableOfContents-code'}>
            {numbering + heading.text}
          </pre>
        </span>
      ); */
      content = (
        <span className={'toc-code-span'} style={{ paddingLeft }}>
          <CodeComponent code={numbering + heading.text} theme={theme} />
        </span>
      );
    }
    return <li onClick={handleClick}>{content}</li>;
  }
}

export interface ITOCTreeStates {
  needNumbering: boolean;
  showCode: boolean;
  showRaw: boolean;
  showMarkdown: boolean;
}

/**
 * A React component for a table of contents.
 */
export class TOCTree extends React.Component<ITOCTreeProps, ITOCTreeStates> {
  /**
   * Render the TOCTree.
   */

  constructor(props: ITOCTreeProps) {
    super(props);
    this.state = {
      needNumbering: this.props.widget.needNumbering,
      showCode: this.props.widget.showCode,
      showRaw: this.props.widget.showRaw,
      showMarkdown: this.props.widget.showMarkdown
    };
  }

  componentWillReceiveProps(nextProps: ITOCTreeProps) {
    this.setState({ needNumbering: this.props.widget.needNumbering });
  }

  handleClick = () => {
    this.props.widget.needNumbering = !this.props.widget.needNumbering;
    this.setState({ needNumbering: this.props.widget.needNumbering });
  };

  toggleCode = (component: React.Component) => {
    this.props.widget.showCode = !this.props.widget.showCode;
    this.setState({ showCode: this.props.widget.showCode });
    component.setState({ selected: this.props.widget.showCode });
    this.props.widget.updateTOC();
  };

  toggleRaw = (component: React.Component) => {
    this.props.widget.showRaw = !this.props.widget.showRaw;
    this.setState({ showRaw: this.props.widget.showRaw });
    component.setState({ selected: this.props.widget.showRaw });
    this.props.widget.updateTOC();
  };

  toggleMarkdown = (component: React.Component) => {
    this.props.widget.showMarkdown = !this.props.widget.showMarkdown;
    this.setState({ showMarkdown: this.props.widget.showMarkdown });
    component.setState({ selected: this.props.widget.showMarkdown });
  };

  private dropDownMenuItems: DropdownItem[] = [
    {
      props: {
        title: 'Show code cells',
        selectedByDefault: this.props.widget.showCode,
        onClickHandler: this.toggleCode.bind(this)
      },
      type: TagTypeDropdownItem
    },
    {
      props: {
        title: 'Show raw cells',
        selectedByDefault: this.props.widget.showRaw,
        onClickHandler: this.toggleRaw.bind(this)
      },
      type: TagTypeDropdownItem
    },
    {
      props: {
        title: 'Show markdown cells',
        selectedByDefault: this.props.widget.showMarkdown,
        onClickHandler: this.toggleMarkdown.bind(this)
      },
      type: TagTypeDropdownItem
    }
  ];

  private renderedDropdownMenu = createDropdownMenu(this.dropDownMenuItems);

  render() {
    // Map the heading objects onto a list of JSX elements.
    let i = 0;
    const DropdownMenu = this.renderedDropdownMenu;
    let listing: JSX.Element[] = this.props.toc.map(el => {
      if (el.type === 'code' && !this.state.showCode) {
        return <div key={`emptycode-${i++}`} />;
      } else if (el.type === 'raw' && !this.state.showRaw) {
        return <div key={`emptyraw-${i++}`} />;
      } else if (el.type === 'markdown' && !this.state.showMarkdown) {
        return <div key={`emptymd-${i++}`} />;
      } else {
        if (el.type === 'code' || el.type === 'raw') {
          return (
            <TOCCodeCell
              needNumbering={this.state.needNumbering}
              heading={el}
              key={`${el.text}-${el.level}-${i++}`}
            />
          );
        } else {
          return (
            <TOCItem
              needNumbering={this.state.needNumbering}
              heading={el}
              key={`${el.text}-${el.level}-${i++}`}
            />
          );
        }
      }
    });

    // const filterByTag = (event: React.MouseEvent<HTMLButtonElement>) => {
    //   this.props.widget.filterByTag("test");
    // }
    // Return the JSX component.
    return (
      <div className="jp-TableOfContents">
        <header>{this.props.title}</header>
        <div className="toc-toolbar">
          <DropdownMenu
            className="celltypes-dropdown"
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
            onClick={event => this.handleClick()}
          >
            <img
              alt="Toggle Auto-Numbering"
              title="Toggle Auto-Numbering"
              src={require('../static/numbering.svg')}
              className="numberingIcon"
            />
          </div>
        </div>
        {/* <button name="test" onClick={event => filterByTag(event)} >Only show tag "test" </button> */}
        <ul className="jp-TableOfContents-content">{listing}</ul>
      </div>
    );
  }
}
