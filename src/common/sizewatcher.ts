// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

/*
 * The default direction.
 */
const DEFAULT_DIRECTION = 'width';

/*
 * The default size for the tiny CSS class to be applied.
 */
const DEFAULT_TINY = 300;

/*
 * The default size for the small CSS class to be applied.
 */
const DEFAULT_SMALL = 500;

/*
 * A helper class for applying size based CSS classes.
 * 
 * This is used to apply CSS classes such as jp-width-small, jp-width-tiny,
 * jp-height-small, jp-height-tiny based on the size of a Widget.
 * 
 * For an example of how this is used, see the NotebookPanel class.
 */
export class SizeWatcher {
  /**
   * Construct a new notebook panel.
   */
  constructor(options: SizeWatcher.IOptions) {
    this.direction = options.direction || DEFAULT_DIRECTION;
    this.tinySize = options.tinySize || DEFAULT_TINY;
    this.smallSize = options.smallSize || DEFAULT_SMALL;
  }

  /* 
   * Get the direction (usually "width" or "height").
   */
  get direction(): string {
    return this._direction;
  }

  /*
   * Set the direction (usually "width" or "height").
   */
  set direction(value: string) {
    this._direction = value;
  }

  /* 
   * Get tinySize in px.
   */
  get tinySize(): number {
    return this._tinySize
  }

  /* 
   * Set tinySize in px.
   */
  set tinySize(value: number) {
    this._tinySize = value;
  }

  /* 
   * Get smallSize in px.
   */
  get smallSize(): number {
    return this._smallSize
  }

  /* 
   * Set smallSize in px.
   */
  set smallSize(value: number) {
    this._smallSize = value;
  }
  
  /*
   * Add or remove CSS classes based on the size of a widget.
   */
  update(size: number, widget: Widget) {
    let direction = this.direction;
    let smallClass = `jp-${direction}-small`;
    let tinyClass = `jp-${direction}-tiny`;
    let hasTiny = widget.hasClass(tinyClass);
    let hasSmall = widget.hasClass(smallClass);

    console.log(size, this.tinySize, this.smallSize);
    if (size > this.smallSize) {
      if (hasSmall) {
        widget.removeClass(smallClass);
      }
      if (hasTiny) {
        widget.removeClass(tinyClass);
      }
    } else if (size > this.tinySize && size < this.smallSize) {
      if (!hasSmall) {
        widget.addClass(smallClass);
      }
      if (hasTiny) {
        widget.removeClass(tinyClass);
      }
    } else if (size < this.tinySize) {
      if (!hasTiny) {
        widget.addClass(tinyClass);
      }
      if (hasSmall) {
        widget.removeClass(smallClass);
      }
    }
  }

  private _tinySize: number;
  private _smallSize: number;
  private _direction: string;
}


/**
 * A namespace for `SizeWatcher` statics.
 */
export namespace SizeWatcher {
  /**
   * An options interface for SizeWatcher.
   */
  export
  interface IOptions {
    /**
     * The direction (usually "width" or "height");
     */
    direction?: string;

    /**
     * The tinySize in px.
     */
    tinySize?: number;

    /**
     * The smallSize in px.
     */
    smallSize?: number;
  }
}
