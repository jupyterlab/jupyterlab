// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';
import { IDocumentInfo } from '../ws-connection/types';
import { IPosition } from '../positioning';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { ISignal, Signal } from '@lumino/signaling';

import { Document, ILSPCodeExtractorsManager } from '../tokens';
import { DocumentConnectionManager } from '../connection_manager';
import { IForeignCodeExtractor } from '../extractors/types';
import { LanguageIdentifier } from '../lsp';
import {
  IEditorPosition,
  IRootPosition,
  ISourcePosition,
  IVirtualPosition
} from '../positioning';
import { DefaultMap, untilReady } from '../utils';

type IRange = CodeEditor.IRange;

type language = string;

interface IVirtualLine {
  /**
   * Inspections for which document should be skipped for this virtual line?
   */
  skipInspect: Array<VirtualDocument.idPath>;

  /**
   * Where does the virtual line belongs to in the source document?
   */
  sourceLine: number | null;

  /**
   * The editor holding this virtual line
   */
  editor: Document.IEditor;
}

export type ForeignDocumentsMap = Map<IRange, Document.IVirtualDocumentBlock>;

interface ISourceLine {
  /**
   * Line corresponding to the block in the entire foreign document
   */
  virtualLine: number;

  /**
   * The CM editor associated with this virtual line.
   */
  editor: Document.IEditor;

  /**
   * Line in the CM editor corresponding to the virtual line.
   */
  editorLine: number;

  /**
   * Shift of the virtual line
   */
  editorShift: CodeEditor.IPosition;

  /**
   * Everything which is not in the range of foreign documents belongs to the host.
   */
  foreignDocumentsMap: ForeignDocumentsMap;
}

/**
 * Check if given position is within range.
 * Both start and end are inclusive.
 * @param position
 * @param range
 */
export function isWithinRange(
  position: CodeEditor.IPosition,
  range: CodeEditor.IRange
): boolean {
  if (range.start.line === range.end.line) {
    return (
      position.line === range.start.line &&
      position.column >= range.start.column &&
      position.column <= range.end.column
    );
  }

  return (
    (position.line === range.start.line &&
      position.column >= range.start.column &&
      position.line < range.end.line) ||
    (position.line > range.start.line &&
      position.column <= range.end.column &&
      position.line === range.end.line) ||
    (position.line > range.start.line && position.line < range.end.line)
  );
}

/**
 * A virtual implementation of IDocumentInfo
 */
export class VirtualDocumentInfo implements IDocumentInfo {
  /**
   * Creates an instance of VirtualDocumentInfo.
   * @param document - the virtual document need to
   * be wrapped.
   */
  constructor(document: VirtualDocument) {
    this._document = document;
  }

  /**
   * Current version of the virtual document.
   */
  version = 0;

  /**
   * Get the text content of the virtual document.
   */
  get text(): string {
    return this._document.value;
  }

  /**
   * Get the uri of the virtual document, if the document is not available,
   * it returns an empty string, users need to check for the length of returned
   * value before using it.
   */
  get uri(): string {
    const uris = DocumentConnectionManager.solveUris(
      this._document,
      this.languageId
    );
    if (!uris) {
      return '';
    }
    return uris.document;
  }

  /**
   * Get the language identifier of the document.
   */
  get languageId(): string {
    return this._document.language;
  }

  /**
   * The wrapped virtual document.
   */
  private _document: VirtualDocument;
}

export namespace VirtualDocument {
  export interface IOptions {
    /**
     * The language identifier of the document.
     */
    language: LanguageIdentifier;

    /**
     * The foreign code extractor manager token.
     */
    foreignCodeExtractors: ILSPCodeExtractorsManager;

    /**
     * Path to the document.
     */
    path: string;

    /**
     * File extension of the document.
     */
    fileExtension: string | undefined;

    /**
     * Notebooks or any other aggregates of documents are not supported
     * by the LSP specification, and we need to make appropriate
     * adjustments for them, pretending they are simple files
     * so that the LSP servers do not refuse to cooperate.
     */
    hasLspSupportedFile: boolean;

    /**
     * Being standalone is relevant to foreign documents
     * and defines whether following chunks of code in the same
     * language should be appended to this document (false, not standalone)
     * or should be considered separate documents (true, standalone)
     *
     */
    standalone?: boolean;

    /**
     * Parent of the current virtual document.
     */
    parent?: VirtualDocument;
  }
}

/**
 *
 * A notebook can hold one or more virtual documents; there is always one,
 * "root" document, corresponding to the language of the kernel. All other
 * virtual documents are extracted out of the notebook, based on magics,
 * or other syntax constructs, depending on the kernel language.
 *
 * Virtual documents represent the underlying code in a single language,
 * which has been parsed excluding interactive kernel commands (magics)
 * which could be misunderstood by the specific LSP server.
 *
 * VirtualDocument has no awareness of the notebook or editor it lives in,
 * however it is able to transform its content back to the notebook space,
 * as it keeps editor coordinates for each virtual line.
 *
 * The notebook/editor aware transformations are preferred to be placed in
 * VirtualEditor descendants rather than here.
 *
 * No dependency on editor implementation (such as CodeMirrorEditor)
 * is allowed for VirtualEditor.
 */
export class VirtualDocument implements IDisposable {
  constructor(options: VirtualDocument.IOptions) {
    this.options = options;
    this.path = this.options.path;
    this.fileExtension = options.fileExtension;
    this.hasLspSupportedFile = options.hasLspSupportedFile;
    this.parent = options.parent;
    this.language = options.language;

    this.virtualLines = new Map();
    this.sourceLines = new Map();
    this.foreignDocuments = new Map();
    this._editorToSourceLine = new Map();
    this._foreignCodeExtractors = options.foreignCodeExtractors;
    this.standalone = options.standalone || false;
    this.instanceId = VirtualDocument.instancesCount;
    VirtualDocument.instancesCount += 1;
    this.unusedStandaloneDocuments = new DefaultMap(
      () => new Array<VirtualDocument>()
    );
    this._remainingLifetime = 6;

    this.documentInfo = new VirtualDocumentInfo(this);
    this.updateManager = new UpdateManager(this);
    this.updateManager.updateBegan.connect(this._updateBeganSlot, this);
    this.updateManager.blockAdded.connect(this._blockAddedSlot, this);
    this.updateManager.updateFinished.connect(this._updateFinishedSlot, this);
    this.clear();
  }

  /**
   * Convert from code editor position into code mirror position.
   */
  static ceToCm(position: CodeEditor.IPosition): IPosition {
    return { line: position.line, ch: position.column };
  }

  /**
   * Number of blank lines appended to the virtual document between
   * each cell.
   */
  blankLinesBetweenCells: number = 2;

  /**
   * Line number of the last line in the real document.
   */
  lastSourceLine: number;

  /**
   * Line number of the last line in the virtual document.
   */
  lastVirtualLine: number;

  /**
   * the remote document uri, version and other server-related info
   */
  documentInfo: IDocumentInfo;

  /**
   * Parent of the current virtual document.
   */
  parent?: VirtualDocument | null;

  /**
   * The language identifier of the document.
   */
  readonly language: string;

  /**
   * Being standalone is relevant to foreign documents
   * and defines whether following chunks of code in the same
   * language should be appended to this document (false, not standalone)
   * or should be considered separate documents (true, standalone)
   */
  readonly standalone: boolean;

  /**
   * Path to the document.
   */
  readonly path: string;

  /**
   * File extension of the document.
   */
  readonly fileExtension: string | undefined;

  /**
   * Notebooks or any other aggregates of documents are not supported
   * by the LSP specification, and we need to make appropriate
   * adjustments for them, pretending they are simple files
   * so that the LSP servers do not refuse to cooperate.
   */
  readonly hasLspSupportedFile: boolean;

  /**
   * Map holding the children `VirtualDocument` .
   */
  readonly foreignDocuments: Map<VirtualDocument.virtualId, VirtualDocument>;

  /**
   * The update manager object.
   */
  readonly updateManager: UpdateManager;

  /**
   * Unique id of the virtual document.
   */
  readonly instanceId: number;

  /**
   * Test whether the document is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Signal emitted when the foreign document is closed
   */
  get foreignDocumentClosed(): ISignal<
    VirtualDocument,
    Document.IForeignContext
  > {
    return this._foreignDocumentClosed;
  }

  /**
   * Signal emitted when the foreign document is opened
   */
  get foreignDocumentOpened(): ISignal<
    VirtualDocument,
    Document.IForeignContext
  > {
    return this._foreignDocumentOpened;
  }

  /**
   * Signal emitted when the foreign document is changed
   */
  get changed(): ISignal<VirtualDocument, VirtualDocument> {
    return this._changed;
  }

  /**
   * Id of the virtual document.
   */
  get virtualId(): VirtualDocument.virtualId {
    // for easier debugging, the language information is included in the ID:
    return this.standalone
      ? this.instanceId + '(' + this.language + ')'
      : this.language;
  }

  /**
   * Return the ancestry to this document.
   */
  get ancestry(): Array<VirtualDocument> {
    if (!this.parent) {
      return [this];
    }
    return this.parent.ancestry.concat([this]);
  }

  /**
   * Return the id path to the virtual document.
   */
  get idPath(): VirtualDocument.idPath {
    if (!this.parent) {
      return this.virtualId;
    }
    return this.parent.idPath + '-' + this.virtualId;
  }

  /**
   * Get the uri of the virtual document.
   */
  get uri(): VirtualDocument.uri {
    const encodedPath = encodeURI(this.path);
    if (!this.parent) {
      return encodedPath;
    }
    return encodedPath + '.' + this.idPath + '.' + this.fileExtension;
  }

  /**
   * Get the text value of the document
   */
  get value(): string {
    let linesPadding = '\n'.repeat(this.blankLinesBetweenCells);
    return this.lineBlocks.join(linesPadding);
  }

  /**
   * Get the last line in the virtual document
   */
  get lastLine(): string {
    const linesInLastBlock =
      this.lineBlocks[this.lineBlocks.length - 1].split('\n');
    return linesInLastBlock[linesInLastBlock.length - 1];
  }

  /**
   * Get the root document of current virtual document.
   */
  get root(): VirtualDocument {
    return this.parent ? this.parent.root : this;
  }

  /**
   * Dispose the virtual document.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;

    this.parent = null;

    this.closeAllForeignDocuments();

    this.updateManager.dispose();
    // clear all the maps

    this.foreignDocuments.clear();
    this.sourceLines.clear();
    this.unusedStandaloneDocuments.clear();
    this.virtualLines.clear();

    // just to be sure - if anything is accessed after disposal (it should not) we
    // will get altered by errors in the console AND this will limit memory leaks

    this.documentInfo = null as any;
    this.lineBlocks = null as any;

    Signal.clearData(this);
  }

  /**
   * Clear the virtual document and all related stuffs
   */
  clear(): void {
    this.unusedStandaloneDocuments.clear();

    for (let document of this.foreignDocuments.values()) {
      document.clear();
      if (document.standalone) {
        let set = this.unusedStandaloneDocuments.get(document.language);
        set.push(document);
      }
    }

    this.virtualLines.clear();
    this.sourceLines.clear();
    this.lastVirtualLine = 0;
    this.lastSourceLine = 0;
    this.lineBlocks = [];
  }

  /**
   * Get the virtual document from the cursor position of the source
   * document
   * @param position - position in source document
   */
  documentAtSourcePosition(position: ISourcePosition): VirtualDocument {
    let sourceLine = this.sourceLines.get(position.line);

    if (!sourceLine) {
      return this;
    }

    let sourcePositionCe: CodeEditor.IPosition = {
      line: sourceLine.editorLine,
      column: position.ch
    };

    for (let [
      range,
      { virtualDocument: document }
    ] of sourceLine.foreignDocumentsMap) {
      if (isWithinRange(sourcePositionCe, range)) {
        let sourcePositionCm = {
          line: sourcePositionCe.line - range.start.line,
          ch: sourcePositionCe.column - range.start.column
        };

        return document.documentAtSourcePosition(
          sourcePositionCm as ISourcePosition
        );
      }
    }

    return this;
  }

  /**
   * Detect if the input source position is belong to the current
   * virtual document.
   *
   * @param sourcePosition - position in the source document
   */
  isWithinForeign(sourcePosition: ISourcePosition): boolean {
    let sourceLine = this.sourceLines.get(sourcePosition.line)!;

    let sourcePositionCe: CodeEditor.IPosition = {
      line: sourceLine.editorLine,
      column: sourcePosition.ch
    };
    for (let [range] of sourceLine.foreignDocumentsMap) {
      if (isWithinRange(sourcePositionCe, range)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compute the position in root document from the position of
   * a child editor.
   *
   * @param editor - the active editor.
   * @param position - position in the active editor.
   */
  transformFromEditorToRoot(
    editor: Document.IEditor,
    position: IEditorPosition
  ): IRootPosition | null {
    if (!this._editorToSourceLine.has(editor)) {
      console.log('Editor not found in _editorToSourceLine map');
      return null;
    }
    let shift = this._editorToSourceLine.get(editor)!;
    return {
      ...(position as IPosition),
      line: position.line + shift
    } as IRootPosition;
  }

  /**
   * Compute the position in the virtual document from the position
   * if the source document.
   *
   * @param sourcePosition - position in source document
   */
  virtualPositionAtDocument(sourcePosition: ISourcePosition): IVirtualPosition {
    let sourceLine = this.sourceLines.get(sourcePosition.line);
    if (sourceLine == null) {
      throw new Error('Source line not mapped to virtual position');
    }
    let virtualLine = sourceLine.virtualLine;

    // position inside the cell (block)
    let sourcePositionCe: CodeEditor.IPosition = {
      line: sourceLine.editorLine,
      column: sourcePosition.ch
    };

    for (let [range, content] of sourceLine.foreignDocumentsMap) {
      const { virtualLine, virtualDocument: document } = content;
      if (isWithinRange(sourcePositionCe, range)) {
        // position inside the foreign document block
        let sourcePositionCm = {
          line: sourcePositionCe.line - range.start.line,
          ch: sourcePositionCe.column - range.start.column
        };
        if (document.isWithinForeign(sourcePositionCm as ISourcePosition)) {
          return this.virtualPositionAtDocument(
            sourcePositionCm as ISourcePosition
          );
        } else {
          // where in this block in the entire foreign document?
          sourcePositionCm.line += virtualLine;
          return sourcePositionCm as IVirtualPosition;
        }
      }
    }

    return {
      ch: sourcePosition.ch,
      line: virtualLine
    } as IVirtualPosition;
  }

  /**
   * Append a code block to the end of the virtual document.
   *
   * @param  block - block to be appended
   * @param  editorShift - position shift in source
   * document
   * @param  [virtualShift] - position shift in
   * virtual document.
   */
  appendCodeBlock(
    block: Document.ICodeBlockOptions,
    editorShift: CodeEditor.IPosition = { line: 0, column: 0 },
    virtualShift?: CodeEditor.IPosition
  ): void {
    let cellCode = block.value;
    let ceEditor = block.ceEditor;

    if (this.isDisposed) {
      console.warn('Cannot append code block: document disposed');
      return;
    }
    let sourceCellLines = cellCode.split('\n');
    let { lines, foreignDocumentsMap } = this.prepareCodeBlock(
      block,
      editorShift
    );

    for (let i = 0; i < lines.length; i++) {
      this.virtualLines.set(this.lastVirtualLine + i, {
        skipInspect: [],
        editor: ceEditor,
        // TODO this is incorrect, won't work if something was extracted
        sourceLine: this.lastSourceLine + i
      });
    }
    for (let i = 0; i < sourceCellLines.length; i++) {
      this.sourceLines.set(this.lastSourceLine + i, {
        editorLine: i,
        editorShift: {
          line: editorShift.line - (virtualShift?.line || 0),
          column: i === 0 ? editorShift.column - (virtualShift?.column || 0) : 0
        },
        // TODO: move those to a new abstraction layer (DocumentBlock class)
        editor: ceEditor,
        foreignDocumentsMap,
        // TODO this is incorrect, won't work if something was extracted
        virtualLine: this.lastVirtualLine + i
      });
    }

    this.lastVirtualLine += lines.length;

    // one empty line is necessary to separate code blocks, next 'n' lines are to silence linters;
    // the final cell does not get the additional lines (thanks to the use of join, see below)

    this.lineBlocks.push(lines.join('\n') + '\n');

    // adding the virtual lines for the blank lines
    for (let i = 0; i < this.blankLinesBetweenCells; i++) {
      this.virtualLines.set(this.lastVirtualLine + i, {
        skipInspect: [this.idPath],
        editor: ceEditor,
        sourceLine: null
      });
    }

    this.lastVirtualLine += this.blankLinesBetweenCells;
    this.lastSourceLine += sourceCellLines.length;
  }

  /**
   * Extract a code block into list of string in supported language and
   * a map of foreign document if any.
   * @param  block - block to be appended
   * @param  editorShift - position shift in source document
   */
  prepareCodeBlock(
    block: Document.ICodeBlockOptions,
    editorShift: CodeEditor.IPosition = { line: 0, column: 0 }
  ): {
    lines: string[];
    foreignDocumentsMap: Map<CodeEditor.IRange, Document.IVirtualDocumentBlock>;
  } {
    let { cellCodeKept, foreignDocumentsMap } = this.extractForeignCode(
      block,
      editorShift
    );
    let lines = cellCodeKept.split('\n');
    return { lines, foreignDocumentsMap };
  }

  /**
   * Extract the foreign code from input block by using the registered
   * extractors.
   * @param  block - block to be appended
   * @param  editorShift - position shift in source document
   */
  extractForeignCode(
    block: Document.ICodeBlockOptions,
    editorShift: CodeEditor.IPosition
  ): {
    cellCodeKept: string;
    foreignDocumentsMap: Map<CodeEditor.IRange, Document.IVirtualDocumentBlock>;
  } {
    let foreignDocumentsMap = new Map<
      CodeEditor.IRange,
      Document.IVirtualDocumentBlock
    >();

    let cellCode = block.value;
    const extractorsForAnyLang = this._foreignCodeExtractors.getExtractors(
      block.type,
      null
    );
    const extractorsForCurrentLang = this._foreignCodeExtractors.getExtractors(
      block.type,
      this.language
    );

    for (let extractor of [
      ...extractorsForAnyLang,
      ...extractorsForCurrentLang
    ]) {
      if (!extractor.hasForeignCode(cellCode, block.type)) {
        continue;
      }

      let results = extractor.extractForeignCode(cellCode);

      let keptCellCode = '';

      for (let result of results) {
        if (result.foreignCode !== null) {
          // result.range should only be null if result.foregin_code is null
          if (result.range === null) {
            console.log(
              'Failure in foreign code extraction: `range` is null but `foreign_code` is not!'
            );
            continue;
          }
          let foreignDocument = this._chooseForeignDocument(extractor);
          foreignDocumentsMap.set(result.range, {
            virtualLine: foreignDocument.lastVirtualLine,
            virtualDocument: foreignDocument,
            editor: block.ceEditor
          });
          let foreignShift = {
            line: editorShift.line + result.range.start.line,
            column: editorShift.column + result.range.start.column
          };
          foreignDocument.appendCodeBlock(
            {
              value: result.foreignCode,
              ceEditor: block.ceEditor,
              type: 'code'
            },
            foreignShift,
            result.virtualShift!
          );
        }
        if (result.hostCode != null) {
          keptCellCode += result.hostCode;
        }
      }
      // not breaking - many extractors are allowed to process the code, one after each other
      // (think JS and CSS in HTML, or %R inside of %%timeit).

      cellCode = keptCellCode;
    }

    return { cellCodeKept: cellCode, foreignDocumentsMap };
  }

  /**
   * Close a foreign document and disconnect all associated signals
   */
  closeForeign(document: VirtualDocument): void {
    this._foreignDocumentClosed.emit({
      foreignDocument: document,
      parentHost: this
    });
    // remove it from foreign documents list
    this.foreignDocuments.delete(document.virtualId);
    // and delete the documents within it
    document.closeAllForeignDocuments();

    document.foreignDocumentClosed.disconnect(this.forwardClosedSignal, this);
    document.foreignDocumentOpened.disconnect(this.forwardOpenedSignal, this);
    document.dispose();
  }

  /**
   * Close all foreign documents.
   */
  closeAllForeignDocuments(): void {
    for (let document of this.foreignDocuments.values()) {
      this.closeForeign(document);
    }
  }

  /**
   * Close all expired documents.
   */
  closeExpiredDocuments(): void {
    const usedDocuments = new Set<VirtualDocument>();
    for (const line of this.sourceLines.values()) {
      for (const block of line.foreignDocumentsMap.values()) {
        usedDocuments.add(block.virtualDocument);
      }
    }

    const documentIDs = new Map<VirtualDocument, string[]>();
    for (const [id, document] of this.foreignDocuments.entries()) {
      const ids = documentIDs.get(document);
      if (typeof ids !== 'undefined') {
        documentIDs.set(document, [...ids, id]);
      }
      documentIDs.set(document, [id]);
    }
    const allDocuments = new Set<VirtualDocument>(documentIDs.keys());
    const unusedVirtualDocuments = new Set(
      [...allDocuments].filter(x => !usedDocuments.has(x))
    );

    for (let document of unusedVirtualDocuments.values()) {
      document.remainingLifetime -= 1;
      if (document.remainingLifetime <= 0) {
        document.dispose();
        const ids = documentIDs.get(document)!;
        for (const id of ids) {
          this.foreignDocuments.delete(id);
        }
      }
    }
  }

  /**
   * Transform the position of the source to the editor
   * position.
   *
   * @param  pos - position in the source document
   * @return position in the editor.
   */
  transformSourceToEditor(pos: ISourcePosition): IEditorPosition {
    let sourceLine = this.sourceLines.get(pos.line)!;
    let editorLine = sourceLine.editorLine;
    let editorShift = sourceLine.editorShift;
    return {
      // only shift column in the line beginning the virtual document (first list of the editor in cell magics, but might be any line of editor in line magics!)
      ch: pos.ch + (editorLine === 0 ? editorShift.column : 0),
      line: editorLine + editorShift.line
      // TODO or:
      //  line: pos.line + editor_shift.line - this.first_line_of_the_block(editor)
    } as IEditorPosition;
  }

  /**
   * Transform the position in the virtual document to the
   * editor position.
   * Can be null because some lines are added as padding/anchors
   * to the virtual document and those do not exist in the source document
   * and thus they are absent in the editor.
   */
  transformVirtualToEditor(
    virtualPosition: IVirtualPosition
  ): IEditorPosition | null {
    let sourcePosition = this.transformVirtualToSource(virtualPosition);
    if (sourcePosition == null) {
      return null;
    }
    return this.transformSourceToEditor(sourcePosition);
  }

  /**
   * Transform the position in the virtual document to the source.
   * Can be null because some lines are added as padding/anchors
   * to the virtual document and those do not exist in the source document.
   */
  transformVirtualToSource(position: IVirtualPosition): ISourcePosition | null {
    const line = this.virtualLines.get(position.line)!.sourceLine;
    if (line == null) {
      return null;
    }
    return {
      ch: position.ch,
      line: line
    } as ISourcePosition;
  }

  /**
   * Compute the position in root document from the position of
   * a virtual document.
   */
  transformVirtualToRoot(position: IVirtualPosition): IRootPosition | null {
    const editor = this.virtualLines.get(position.line)?.editor;
    const editorPosition = this.transformVirtualToEditor(position);
    if (!editor || !editorPosition) {
      return null;
    }
    return this.root.transformFromEditorToRoot(editor, editorPosition);
  }

  /**
   * Get the corresponding editor of the virtual line.
   */
  getEditorAtVirtualLine(pos: IVirtualPosition): Document.IEditor {
    let line = pos.line;
    // tolerate overshot by one (the hanging blank line at the end)
    if (!this.virtualLines.has(line)) {
      line -= 1;
    }
    return this.virtualLines.get(line)!.editor;
  }

  /**
   * Get the corresponding editor of the source line
   */
  getEditorAtSourceLine(pos: ISourcePosition): Document.IEditor {
    return this.sourceLines.get(pos.line)!.editor;
  }

  /**
   * Recursively emits changed signal from the document or any descendant foreign document.
   */
  maybeEmitChanged(): void {
    if (this.value !== this.previousValue) {
      this._changed.emit(this);
    }
    this.previousValue = this.value;
    for (let document of this.foreignDocuments.values()) {
      document.maybeEmitChanged();
    }
  }

  /**
   * When this counter goes down to 0, the document will be destroyed and the associated connection will be closed;
   * This is meant to reduce the number of open connections when a foreign code snippet was removed from the document.
   *
   * Note: top level virtual documents are currently immortal (unless killed by other means); it might be worth
   * implementing culling of unused documents, but if and only if JupyterLab will also implement culling of
   * idle kernels - otherwise the user experience could be a bit inconsistent, and we would need to invent our own rules.
   */
  protected get remainingLifetime(): number {
    if (!this.parent) {
      return Infinity;
    }
    return this._remainingLifetime;
  }

  protected set remainingLifetime(value: number) {
    if (this.parent) {
      this._remainingLifetime = value;
    }
  }

  /**
   * Virtual lines keep all the lines present in the document AND extracted to the foreign document.
   */
  protected virtualLines: Map<number, IVirtualLine>;
  protected sourceLines: Map<number, ISourceLine>;
  protected lineBlocks: Array<string>;

  protected unusedStandaloneDocuments: DefaultMap<
    language,
    Array<VirtualDocument>
  >;

  private _isDisposed = false;
  private _remainingLifetime: number;
  private _editorToSourceLine: Map<Document.IEditor, number>;
  private _editorToSourceLineNew: Map<Document.IEditor, number>;
  private _foreignCodeExtractors: ILSPCodeExtractorsManager;
  private previousValue: string;
  private static instancesCount = 0;
  private readonly options: VirtualDocument.IOptions;

  /**
   * Get the foreign document that can be opened with the input extractor.
   */
  private _chooseForeignDocument(
    extractor: IForeignCodeExtractor
  ): VirtualDocument {
    let foreignDocument: VirtualDocument;
    // if not standalone, try to append to existing document
    let foreignExists = this.foreignDocuments.has(extractor.language);
    if (!extractor.standalone && foreignExists) {
      foreignDocument = this.foreignDocuments.get(extractor.language)!;
    } else {
      // if (previous document does not exists) or (extractor produces standalone documents
      // and no old standalone document could be reused): create a new document
      let unusedStandalone = this.unusedStandaloneDocuments.get(
        extractor.language
      );
      if (extractor.standalone && unusedStandalone.length > 0) {
        foreignDocument = unusedStandalone.pop()!;
      } else {
        foreignDocument = this.openForeign(
          extractor.language,
          extractor.standalone,
          extractor.fileExtension
        );
      }
    }
    return foreignDocument;
  }

  /**
   * Create a foreign document from input language and file extension.
   *
   * @param  language - the required language
   * @param  standalone - the document type is supported natively by LSP?
   * @param  fileExtension - File extension.
   */
  private openForeign(
    language: language,
    standalone: boolean,
    fileExtension: string
  ): VirtualDocument {
    let document = new (this.constructor as new (
      ...args: ConstructorParameters<typeof VirtualDocument>
    ) => VirtualDocument)({
      ...this.options,
      parent: this,
      standalone: standalone,
      fileExtension: fileExtension,
      language: language
    });

    const context: Document.IForeignContext = {
      foreignDocument: document,
      parentHost: this
    };
    this._foreignDocumentOpened.emit(context);
    // pass through any future signals
    document.foreignDocumentClosed.connect(this.forwardClosedSignal, this);
    document.foreignDocumentOpened.connect(this.forwardOpenedSignal, this);

    this.foreignDocuments.set(document.virtualId, document);

    return document;
  }

  /**
   * Forward the closed signal from the foreign document to the host document's
   * signal
   */
  private forwardClosedSignal(
    host: VirtualDocument,
    context: Document.IForeignContext
  ) {
    this._foreignDocumentClosed.emit(context);
  }

  /**
   * Forward the opened signal from the foreign document to the host document's
   * signal
   */
  private forwardOpenedSignal(
    host: VirtualDocument,
    context: Document.IForeignContext
  ) {
    this._foreignDocumentOpened.emit(context);
  }

  /**
   * Slot of the `updateBegan` signal.
   */
  private _updateBeganSlot(): void {
    this._editorToSourceLineNew = new Map();
  }

  /**
   * Slot of the `blockAdded` signal.
   */
  private _blockAddedSlot(
    updateManager: UpdateManager,
    blockData: IBlockAddedInfo
  ): void {
    this._editorToSourceLineNew.set(
      blockData.block.ceEditor,
      blockData.virtualDocument.lastSourceLine
    );
  }

  /**
   * Slot of the `updateFinished` signal.
   */
  private _updateFinishedSlot(): void {
    this._editorToSourceLine = this._editorToSourceLineNew;
  }

  private _foreignDocumentClosed = new Signal<
    VirtualDocument,
    Document.IForeignContext
  >(this);
  private _foreignDocumentOpened = new Signal<
    VirtualDocument,
    Document.IForeignContext
  >(this);
  private _changed = new Signal<VirtualDocument, VirtualDocument>(this);
}

export namespace VirtualDocument {
  /**
   * Identifier composed of `virtual_id`s of a nested structure of documents,
   * used to aide assignment of the connection to the virtual document
   * handling specific, nested language usage; it will be appended to the file name
   * when creating a connection.
   */
  export type idPath = string;
  /**
   * Instance identifier for standalone documents (snippets), or language identifier
   * for documents which should be interpreted as one when stretched across cells.
   */
  export type virtualId = string;
  /**
   * Identifier composed of the file path and id_path.
   */
  export type uri = string;
}

/**
 * Create foreign documents if available from input virtual documents.
 * @param virtualDocument - the virtual document to be collected
 * @return - Set of generated foreign documents
 */
export function collectDocuments(
  virtualDocument: VirtualDocument
): Set<VirtualDocument> {
  let collected = new Set<VirtualDocument>();
  collected.add(virtualDocument);
  for (let foreign of virtualDocument.foreignDocuments.values()) {
    let foreignLanguages = collectDocuments(foreign);
    foreignLanguages.forEach(collected.add, collected);
  }
  return collected;
}

export interface IBlockAddedInfo {
  /**
   * The virtual document.
   */
  virtualDocument: VirtualDocument;

  /**
   * Option of the code block.
   */
  block: Document.ICodeBlockOptions;
}

export class UpdateManager implements IDisposable {
  constructor(private virtualDocument: VirtualDocument) {
    this._blockAdded = new Signal<UpdateManager, IBlockAddedInfo>(this);
    this._documentUpdated = new Signal<UpdateManager, VirtualDocument>(this);
    this._updateBegan = new Signal<UpdateManager, Document.ICodeBlockOptions[]>(
      this
    );
    this._updateFinished = new Signal<
      UpdateManager,
      Document.ICodeBlockOptions[]
    >(this);
    this.documentUpdated.connect(this._onUpdated, this);
  }

  /**
   * Promise resolved when the updating process finishes.
   */
  get updateDone(): Promise<void> {
    return this._updateDone;
  }
  /**
   * Test whether the document is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Signal emitted when a code block is added to the document.
   */
  get blockAdded(): ISignal<UpdateManager, IBlockAddedInfo> {
    return this._blockAdded;
  }

  /**
   * Signal emitted by the editor that triggered the update,
   * providing the root document of the updated documents.
   */
  get documentUpdated(): ISignal<UpdateManager, VirtualDocument> {
    return this._documentUpdated;
  }

  /**
   * Signal emitted when the update is started
   */
  get updateBegan(): ISignal<UpdateManager, Document.ICodeBlockOptions[]> {
    return this._updateBegan;
  }

  /**
   * Signal emitted when the update is finished
   */
  get updateFinished(): ISignal<UpdateManager, Document.ICodeBlockOptions[]> {
    return this._updateFinished;
  }

  /**
   * Dispose the class
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.documentUpdated.disconnect(this._onUpdated);
    Signal.clearData(this);
  }

  /**
   * Execute provided callback within an update-locked context, which guarantees that:
   *  - the previous updates must have finished before the callback call, and
   *  - no update will happen when executing the callback
   * @param fn - the callback to execute in update lock
   */
  async withUpdateLock(fn: () => void): Promise<void> {
    await untilReady(() => this._canUpdate(), 12, 10).then(() => {
      try {
        this._updateLock = true;
        fn();
      } finally {
        this._updateLock = false;
      }
    });
  }

  /**
   * Update all the virtual documents, emit documents updated with root document if succeeded,
   * and resolve a void promise. The promise does not contain the text value of the root document,
   * as to avoid an easy trap of ignoring the changes in the virtual documents.
   */
  async updateDocuments(blocks: Document.ICodeBlockOptions[]): Promise<void> {
    let update = new Promise<void>((resolve, reject) => {
      // defer the update by up to 50 ms (10 retrials * 5 ms break),
      // awaiting for the previous update to complete.
      untilReady(() => this._canUpdate(), 10, 5)
        .then(() => {
          if (this.isDisposed || !this.virtualDocument) {
            resolve();
          }
          try {
            this._isUpdateInProgress = true;
            this._updateBegan.emit(blocks);

            this.virtualDocument.clear();

            for (let codeBlock of blocks) {
              this._blockAdded.emit({
                block: codeBlock,
                virtualDocument: this.virtualDocument
              });
              this.virtualDocument.appendCodeBlock(codeBlock);
            }

            this._updateFinished.emit(blocks);

            if (this.virtualDocument) {
              this._documentUpdated.emit(this.virtualDocument);
              this.virtualDocument.maybeEmitChanged();
            }

            resolve();
          } catch (e) {
            console.warn('Documents update failed:', e);
            reject(e);
          } finally {
            this._isUpdateInProgress = false;
          }
        })
        .catch(console.error);
    });
    this._updateDone = update;
    return update;
  }

  private _isDisposed = false;

  /**
   * Promise resolved when the updating process finishes.
   */
  private _updateDone: Promise<void> = new Promise<void>(resolve => {
    resolve();
  });

  /**
   * Virtual documents update guard.
   */
  private _isUpdateInProgress: boolean = false;

  /**
   * Update lock to prevent multiple updates are applied at the same time.
   */
  private _updateLock: boolean = false;

  private _blockAdded: Signal<UpdateManager, IBlockAddedInfo>;
  private _documentUpdated: Signal<UpdateManager, VirtualDocument>;
  private _updateBegan: Signal<UpdateManager, Document.ICodeBlockOptions[]>;
  private _updateFinished: Signal<UpdateManager, Document.ICodeBlockOptions[]>;

  /**
   * Once all the foreign documents were refreshed, the unused documents (and their connections)
   * should be terminated if their lifetime has expired.
   */
  private _onUpdated(manager: UpdateManager, rootDocument: VirtualDocument) {
    try {
      rootDocument.closeExpiredDocuments();
    } catch (e) {
      console.warn('Failed to close expired documents');
    }
  }

  /**
   * Check if the document can be updated.
   */
  private _canUpdate() {
    return !this.isDisposed && !this._isUpdateInProgress && !this._updateLock;
  }
}
