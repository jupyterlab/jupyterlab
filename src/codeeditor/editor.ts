// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  IMessageHandler, Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * A zero-based position in the editor.
 */
export
  interface IPosition {
  line: number;
  column: number;
}

export
  interface IDimension {
  width: number;
  height: number;
}

/**
 * Configuration options for the editor.
 */
export interface IEditorConfiguration extends IDisposable {
  /**
   * A signal emitted when this configuration changed.
   */
  configurationChanged: ISignal<IEditorConfiguration, void>;
  /**
   * Control the rendering of line numbers.
   */
  lineNumbers: boolean;
  /**
   * Should the editor be read only.
   */
  readOnly: boolean;
}

/**
 * An editor model.
 */
export interface IEditorModel extends IDisposable {
  /**
   * A signal emitted when a uri of this model changed.
   */
  uriChanged: ISignal<IEditorModel, void>;
  /**
   * A signal emitted when a content of this model changed.
   */
  contentChanged: ISignal<IEditorModel, void>;
  /**
   * A signal emitted when a mime type of this model changed.
   */
  mimeTypeChanged: ISignal<IEditorModel, void>;
  /**
   * An uri associated with this model.
   */
  uri: string;
  /**
   * A mime type for this model.
   */
  mimeType: string;
  /**
   * Get the text stored in this model.
   */
  getValue(): string;
  /**
   * Replace the entire text contained in this model.
   */
  setValue(value: string): void;
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
  getLineContent(line: number): string;
  /**
   * Find an offset fot the given position.
   */
  getOffsetAt(position: IPosition): number;
  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): IPosition;
}

export
type CodeEditorProvider<E extends AbstractCodeEditor> = (widget: Widget) => E;

export
abstract class AbstractCodeEditor implements IDisposable {

  isDisposed: boolean;

  constructor(protected widget: Widget) {
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._dispose();
    this.isDisposed = true;
  }

  protected _dispose() {
    this.widget = null;
  }

  /**
   * A cursor position for this editor.
   */
  abstract getPosition(): IPosition;
  abstract setPosition(position:IPosition): void; 

  /**
   * Brings browser focus to this editor text.
   */
  abstract focus(): void;

  /**
   * Test whether the editor has keyboard focus.
   */
  abstract isFocused(): boolean;

  /**
   * Changes the editor size.
   */
  abstract setSize(size: IDimension): void;

  /**
   * Resize the editor.
   */
  abstract refresh(): void;

  /**
   * Returns a model for this editor.
   */
  abstract getModel(): IEditorModel;

  /**
    * Returns a configuration for this editor.
    */
  abstract getConfiguration(): IEditorConfiguration;

}