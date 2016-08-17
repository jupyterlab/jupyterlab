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
  lineNumbers?: boolean;

  /**
   * The font size.
   */
  fontSize?: number;

  /**
   * The line height.
   */
  lineHeight?: number;

  /**
   * Should the editor be read only.
   */
  readOnly?: boolean;

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
   * Find an offset fot the given position.
   */
  getOffsetAt(position: IPosition): number;

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): IPosition;

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