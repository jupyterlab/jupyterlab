// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeData } from '@lumino/coreutils';

// 'string' is allowed so as to make it non-breaking for any 1.x releases
export type ClipboardData = string | MimeData;

/**
 * The clipboard interface.
 */
export namespace Clipboard {
  /**
   * Get the application clipboard instance.
   *
   * @deprecated To use `SystemClipboard.getInstance` for copy/cut/paste cells.
   */
  export function getInstance(): MimeData {
    return Private.instance;
  }

  /**
   * Set the application clipboard instance.
   *
   * @deprecated will be removed in a future release. Use `SystemClipboard.getInstance`.
   */
  export function setInstance(value: MimeData): void {
    Private.instance = value;
  }

  /**
   * Copy text to the system clipboard.
   *
   * #### Notes
   * This can only be called in response to a user input event.
   */
  export function copyToSystem(clipboardData: ClipboardData): void {
    const node = document.body;
    const handler = (event: ClipboardEvent) => {
      const data = event.clipboardData || (window as any).clipboardData;
      if (typeof clipboardData === 'string') {
        data.setData('text', clipboardData);
      } else {
        (clipboardData as MimeData).types().map((mimeType: string) => {
          data.setData(mimeType, clipboardData.getData(mimeType));
        });
      }
      event.preventDefault();
      node.removeEventListener('copy', handler);
    };
    node.addEventListener('copy', handler);
    generateEvent(node);
  }

  /**
   * Generate a clipboard event on a node.
   *
   * @param node - The element on which to generate the event.
   *
   * @param type - The type of event to generate.
   *   `'paste'` events cannot be programmatically generated.
   *
   * #### Notes
   * This can only be called in response to a user input event.
   */
  export function generateEvent(
    node: HTMLElement,
    type: 'copy' | 'cut' = 'copy'
  ): void {
    // http://stackoverflow.com/a/5210367

    // Identify selected text.
    let sel = window.getSelection();

    // Save the current selection.
    const savedRanges: any[] = [];
    for (let i = 0, len = sel?.rangeCount || 0; i < len; ++i) {
      savedRanges[i] = sel!.getRangeAt(i).cloneRange();
    }

    // Select the node content.
    const range = document.createRange();
    range.selectNodeContents(node);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Execute the command.
    document.execCommand(type);

    // Restore the previous selection.
    sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      for (let i = 0, len = savedRanges.length; i < len; ++i) {
        sel.addRange(savedRanges[i]);
      }
    }
  }
}

/**
 * The clipboard interface supporting the native clipboard API.
 */
export namespace SystemClipboard {
  /**
   * Get the system clipboard instance.
   */
  export function getInstance(): IClipboard {
    return Private.systemInstance;
  }

  /**
   * The interface for the system clipboard.
   */
  export interface IClipboard {
    /**
     * Whether the clipboard has data for a given mime type.
     * Returns `false` if the data does not exist.
     *
     * @param mime - The mime type to check.
     */
    hasData(mime: string): Promise<boolean>;

    /**
     * Retrieve the data for a given mime type.
     * Returns `null` if the data does not exist.
     *
     * @param mime - The mime type to retrieve.
     */
    getData(mime: string): Promise<unknown | null>;

    /**
     * Set the data for a given mime type.
     *
     * @param mime - The mime type to set.
     * @param data - The data to set.
     */
    setData(mime: string, data: unknown): Promise<void>;

    /**
     * Clear the clipboard.
     */
    clear(): void;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The mimetype used for Jupyter cell data.
   */
  const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

  /**
   * An implementation of the clipboard interface.
   * This uses the native clipboard API when available, with a fallback to
   * a MimeData instance otherwise - The native clipboard API only works in
   * secure contexts (pages served over HTTPS or localhost).
   */
  class ClipboardImpl implements SystemClipboard.IClipboard {
    /**
     * The fallback clipboard instance.
     */
    fallback: MimeData;

    /**
     * Create a new clipboard instance.
     */
    constructor(fallback?: MimeData) {
      this.fallback = fallback || new MimeData();
      const { systemClipboard } = this;
      if (!systemClipboard) {
        console.warn('Clipboard API not available');
      }
    }

    /**
     * Clear the clipboard.
     * This is a no-op for the native clipboard API.
     * The fallback clipboard is cleared by setting the data to an empty
     */
    clear(): void {
      this.fallback.clear();
    }

    /**
     * Whether the clipboard has data for a given mime type.
     * Returns `false` if the data does not exist.
     *
     * @param mime - The mime type to check.
     */
    async hasData(mime: string): Promise<boolean> {
      const { systemClipboard } = this;
      if (!systemClipboard) {
        return this.fallback.hasData(mime);
      }
      let text: string;
      try {
        text = await systemClipboard.readText();
      } catch (reason) {
        console.warn('Failed to read data from clipboard:', reason);
        if (reason.name === 'NotAllowedError') {
          // If the clipboard API is not allowed, fall back to the
          // internal clipboard.
          return this.fallback.hasData(mime);
        }
        return false;
      }
      try {
        this.convertStringToData(mime, text);
        return true;
      } catch (reason) {
        return false;
      }
    }

    /**
     * Retrieve the data for a given mime type.
     *
     * @param mime - The mime type to retrieve.
     * @returns A promise that resolves with the data for the given mime type.
     */
    async getData(mime: string): Promise<unknown> {
      const { systemClipboard } = this;
      if (!systemClipboard) {
        return this.fallback.getData(mime);
      }
      try {
        const text = await systemClipboard.readText();
        return this.convertStringToData(mime, text);
      } catch (reason) {
        console.warn('Failed to read data from clipboard:', reason);
        if (reason.name === 'NotAllowedError') {
          // If the clipboard API is not allowed, fall back to the
          // internal clipboard.
          return this.fallback.getData(mime);
        }
        return null;
      }
    }

    /**
     * Set the data for a given mime type.
     *
     * @param mime - The mime type to set.
     * @param data - The data to set.
     */
    async setData(mime: string, data: unknown): Promise<void> {
      const { systemClipboard } = this;
      if (!systemClipboard) {
        this.fallback.clear();
        this.fallback.setData(mime, data);
        return;
      }
      try {
        await systemClipboard.writeText(this.convertDataToString(mime, data));
      } catch (reason) {
        console.warn('Failed to write data to clipboard:', reason);
        // If the clipboard API is not allowed, fall back to the
        // internal clipboard.
        this.fallback.clear();
        this.fallback.setData(mime, data);
      }
    }

    /**
     * Convert the data to a string for the given mime type.
     */
    convertDataToString(mime: string, data: unknown): string {
      if (mime === JUPYTER_CELL_MIME) {
        return JSON.stringify(data);
      }
      return (data || '').toString();
    }

    /**
     * Convert the string to data for the given mime type.
     */
    convertStringToData(mime: string, text: string): unknown {
      if (mime === JUPYTER_CELL_MIME) {
        return JSON.parse(text);
      }
      return text;
    }

    /**
     * Get the system clipboard instance.
     */
    get systemClipboard() {
      return navigator.clipboard;
    }
  }

  /**
   * The application clipboard instance.
   */
  export let instance = new MimeData();

  /**
   * The system clipboard instance.
   */
  export let systemInstance = new ClipboardImpl();
}
