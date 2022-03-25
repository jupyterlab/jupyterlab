// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { VDomRenderer } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import * as React from 'react';
import { TableOfContents } from '.';
import { TOCTree } from './toctree';
import { IHeading } from './tokens';

/**
 * Timeout for throttling ToC rendering.
 *
 * @private
 */
// TODO
// const RENDER_TIMEOUT = 1000;

/**
 * Widget for hosting a notebook table of contents.
 */
export class TableOfContentsWidget extends VDomRenderer<TableOfContents.IModel | null> {
  constructor(options: TableOfContents.IOptions) {
    super(options.model);
    this._rendermime = options.rendermime;
  }

  /**
   * Called to update the state of the widget.
   *
   * The default implementation of this method triggers
   * VDOM based rendering by calling the `renderDOM` method.
   */
  protected onUpdateRequest(msg: Message): void {
    // Will set renderPromise to resolve once ReactDOM.create is resolved
    super.onUpdateRequest(msg);
    this.renderPromise?.then(() => {
      if (this.model?.usesLatex && this._rendermime.latexTypesetter) {
        this._rendermime.latexTypesetter.typeset(this.node);
      }
    });
  }

  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }

    return (
      <TOCTree
        headings={this.model.headings}
        onCollapseChange={(heading: IHeading) => {
          this.model!.toggleCollapse(heading);
        }}
        setActiveHeading={(heading: IHeading) => {
          this.model!.activeHeading = heading;
        }}
      ></TOCTree>
    );
  }

  private _rendermime: IRenderMimeRegistry;
}

// class OldToC extends Widget {
//   /**
//    * Returns a new table of contents.
//    *
//    * @param options - options
//    * @returns widget
//    */
//   constructor(options: ITableOfContents.IOptions) {
//     super();
//     this.translator = options.translator || nullTranslator;
//     this._docmanager = options.docmanager;
//     this._rendermime = options.rendermime;
//     this._trans = this.translator.load('jupyterlab');
//     this._headings = [];
//     this._entryClicked = new Signal<TableOfContents, TOCItem>(this);
//     this._entryClicked.connect((toc, item) => {
//       this.activeEntry = item.props.heading;
//     });

//     if (this._current) {
//       this._headings = this._current.generator.generate(
//         this._current.widget,
//         this._current.generator.options
//       );
//     }
//   }

//   /**
//    * Current widget-generator tuple for the ToC.
//    */
//   get current(): ITableOfContents.ICurrentWidget | null {
//     return this._current;
//   }
//   set current(value: ITableOfContents.ICurrentWidget | null) {
//     // If they are the same as previously, do nothing...
//     if (
//       value &&
//       this._current &&
//       this._current.widget === value.widget &&
//       this._current.generator === value.generator
//     ) {
//       return;
//     }
//     this._current = value;

//     if (this.generator) {
//       if (this.generator.toolbarGenerator) {
//         this._toolbar = this.generator.toolbarGenerator();
//       } else {
//         this._toolbar = null;
//       }
//     }
//     // Dispose an old activity monitor if one existed...
//     if (this._monitor) {
//       this._monitor.dispose();
//       this._monitor = null;
//     }
//     // If we are wiping the ToC, update and return...
//     if (!this._current) {
//       this.update();
//       return;
//     }
//     // Find the document model associated with the widget:
//     const context = this._docmanager.contextForWidget(this._current.widget);
//     if (!context || !context.model) {
//       throw Error('Could not find a context for the Table of Contents');
//     }
//     // Throttle the rendering rate of the table of contents:
//     this._monitor = new ActivityMonitor({
//       signal: context.model.contentChanged,
//       timeout: RENDER_TIMEOUT
//     });
//     this._monitor.activityStopped.connect(this.update, this);
//     this.update();
//   }

//   /**
//    * Current table of contents generator.
//    *
//    * @returns table of conteIProvidertor
//    */
//   get generator(): Registry.IGenerator<Widget> | null {
//     if (this._current) {
//       return this._current.generator;
//     }
//     return null;
//   }

//   /**
//    * Callback invoked upon an update request.
//    *
//    * @param msg - message
//    */
//   protected onUpdateRequest(msg: Message): void {
//     let title = this._trans.__('Table of Contents');
//     if (this._current) {
//       this._headings = this._current.generator.generate(
//         this._current.widget,
//         this._current.generator.options
//       );
//       const context = this._docmanager.contextForWidget(this._current.widget);
//       if (context) {
//         title = PathExt.basename(context.localPath);
//       }
//     }
//     let itemRenderer: (
//       item: IHeading,
//       toc: IHeading[]
//     ) => JSX.Element | null = (item: IHeading) => {
//       return <span>{item.text}</span>;
//     };
//     if (this._current && this._current.generator.itemRenderer) {
//       itemRenderer = this._current.generator.itemRenderer!;
//     }
//     let jsx = (
//       <div className="jp-TableOfContents">
//         <div className="jp-stack-panel-header">{title}</div>
//       </div>
//     );
//     if (this._current && this._current.generator) {
//       jsx = (
//         <TOCTree
//           title={title}
//           toc={this._headings}
//           entryClicked={this._entryClicked}
//           generator={this.generator}
//           itemRenderer={itemRenderer}
//           toolbar={null}
//         />
//       );
//     }
//     // ReactDOM.render(jsx, this.node, () => {
//     //   if (
//     //     this._current &&
//     //     this._current.generator.usesLatex === true &&
//     //     this._rendermime.latexTypesetter
//     //   ) {
//     //     this._rendermime.latexTypesetter.typeset(this.node);
//     //   }
//     // });
//   }

//   /**
//    * Current active entry.
//    *
//    * @returns table of contents active entry
//    */
//   get activeEntry(): IHeading {
//     return this._activeEntry;
//   }

//   /**
//    * List of headings.
//    *
//    * @returns table of contents list of headings
//    */
//   get headings(): IHeading[] {
//     return this._headings;
//   }

//   /**
//    * Callback invoked to re-render after showing a table of contents.
//    *
//    * @param msg - message
//    */
//   protected onAfterShow(msg: Message): void {
//     this.update();
//   }

//   private translator: ITranslator;
//   private _activeEntry: IHeading;
//   private _entryClicked?: Signal<TableOfContents, TOCItem>;
//   private _trans: TranslationBundle;
//   private _rendermime: IRenderMimeRegistry;
//   private _docmanager: IDocumentManager;
//   private _current: any;
//   private _monitor: ActivityMonitor<any, any> | null;
//   private _headings: IHeading[];
// }
