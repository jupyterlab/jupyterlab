// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    ISignal
} from 'phosphor/lib/core/signaling';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

/**
 * A zero-based position in the editor.
 */
export
interface IPosition {
  line: number,
  column: number
}

/**
 * Utility functions for a position.
 */
export
namespace IPosition {

  /**
   * Creates a new position.
   */
  export
  function create(line: number, column: number) {
    return { line, column }
  }

  /**
   * Returns true if given positions equals; otherwise false. 
   */
  export
  function equals(left:IPosition, right:IPosition): boolean {
    if (left === null) {
      return right === null;  
    }
    return left.line === left.line && left.column === left.column;
  }

  /**
   * A start position.
   */
  export
  const startPosition:IPosition = IPosition.create(0, 0);

  /**
   * Tests whether the given position is the start position.
   */
  export
  function isStartPosition(position:IPosition) {
    return IPosition.equals(position, this.startPosition);
  }

}

/**
 * Configuration options for the editor.
 */
export
interface IEditorConfiguration extends IDisposable {

  /**
   * A signal emitted when this configuration changed.
   */
  configurationChanged: ISignal<IEditorConfiguration, void>;

  /**
   * Control the rendering of line numbers.
   */
  lineNumbers: boolean;

  /**
   * The font size.
   */
  fontSize: number;

  /**
   * The line height.
   */
  lineHeight: number;

  /**
   * Should the editor be read only.
   */
  readOnly: boolean;

}

/**
 * An editor model.
 */
export
interface IEditorModel extends IDisposable {

  /**
   * A signal emitted when a uri of this model changed.
   */
  uriChanged: ISignal<IEditorModel, void>;

  /**
   * A signal emitted when a content of this model changed.
   */
  contentChanged: ISignal<IEditorModel, void>;

  /**
   * A path associated with this editor model.
   */
  uri:string

  /**
   * Get the text stored in this model.
   */
  getValue(): string;

  /**
   * Replace the entire text contained in this model.
   */
  setValue(value: string): void;

  /**
   * Change the mime type for this model.
   */
  setMimeType(mimeType: string): void;

  /**
   * Get the number of lines in the model.
   */
  getLineCount(): number;

  /**
   * Returns a last line number.
   */
  getLastLine(): number;

  /**
   * Returns a content for the given line number.
   */
  getLineContent(line:number): string;

  /**
   * Find an offset fot the given position.
   */
  getOffsetAt(position: IPosition): number;

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): IPosition;

}

/**
 * Utility functions for a model.
 */
export
namespace IEditorModel {

  /**
   * Returns an end position of the given model.
   */
  export
  function getEndPosition(model:IEditorModel): IPosition {
    const lastLine = model.getLastLine();
    const lastColumn = model.getLineContent(lastLine).length;
    return IPosition.create(lastLine, lastColumn);
  }

  /**
   * Tests whether the given position is an end position of the given model.
   */
  export
  function isEndPosition(model:IEditorModel, position:IPosition): boolean {
    const endPosition = getEndPosition(model);
    return IPosition.equals(endPosition, position);
  }

}

/**
 * An editor.
 */
export
interface IEditorView extends IDisposable {

  /**
   * A signal emitted when an editor is closed.
   */
  closed: ISignal<IEditorView, void>;

  /**
   * A cursor position for this editor.
   */
  position:IPosition;

  /**
   * Returns a model for this editor.
   */
  getModel(): IEditorModel;

  /**
   * Returns a configuration for this editor.
   */
  getConfiguration(): IEditorConfiguration;

  /**
   * Return a left offset for the given position.
   */
  getLeftOffset(position: IPosition): number;

  /**
   * Return a top offset fot the given position.
   */
  getTopOffset(position: IPosition): number;

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean;

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void;

}

/**
 * Utility functions for an editor.
 */
export
namespace IEditorView {

  /**
   * Tests whether a cursor at the start position. 
   */
  export
  function isAtStartPositoin(editor:IEditorView): boolean {
    const position = editor.position;
    return IPosition.isStartPosition(position);
  }

  /**
   * Tests whether a cursor at the end position.
   */
  export
  function isAtEndPosition(editor:IEditorView): boolean {
    const position = editor.position;
    return IEditorModel.isEndPosition(editor.getModel(), position);
  }

}