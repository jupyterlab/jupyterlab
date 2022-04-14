import { CodeEditor } from '@jupyterlab/codeeditor';

import { closeBrackets } from '@codemirror/closebrackets';
import { defaultKeymap } from '@codemirror/commands';
import * as gutter from '@codemirror/gutter';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { indentUnit } from '@codemirror/language';

import {
  Compartment,
  EditorState,
  Extension,
  Facet,
  StateEffect
} from '@codemirror/state';

import { EditorView, KeyBinding, keymap } from '@codemirror/view';

export namespace Configuration {
  /**
   * The configuration options for a codemirror editor.
   */
  export interface IConfig extends CodeEditor.IConfig {
    /**
     * The mode to use.
     */
    mode?: string;

    /**
     * The theme to style the editor with.
     * You must make sure the CSS file defining the corresponding
     * .cm-s-[name] styles is loaded.
     */
    theme?: string;

    // FIXME-TRANS: Handle theme localizable names
    // themeDisplayName?: string

    /**
     * Whether to use the context-sensitive indentation that the mode provides
     * (or just indent the same as the line before).
     */
    smartIndent?: boolean;

    /**
     * Configures whether the editor should re-indent the current line when a
     * character is typed that might change its proper indentation
     * (only works if the mode supports indentation).
     */
    electricChars?: boolean;

    /**
     * Configures the keymap to use. The default is "default", which is the
     * only keymap defined in codemirror.js itself.
     * Extra keymaps are found in the CodeMirror keymap directory.
     */
    keyMap?: string;

    /**
     * Can be used to specify extra keybindings for the editor, alongside the
     * ones defined by keyMap. Should be either null, or a valid keymap value.
     */
    extraKeys?: KeyBinding[] | null;

    /**
     * Can be used to add extra gutters (beyond or instead of the line number
     * gutter).
     * Should be an array of CSS class names, each of which defines a width
     * (and optionally a background),
     * and which will be used to draw the background of the gutters.
     * May include the CodeMirror-linenumbers class, in order to explicitly
     * set the position of the line number gutter
     * (it will default to be to the right of all other gutters).
     * These class names are the keys passed to setGutterMarker.
     */
    gutters?: string[];

    /**
     * Determines whether the gutter scrolls along with the content
     * horizontally (false)
     * or whether it stays fixed during horizontal scrolling (true,
     * the default).
     */
    fixedGutter?: boolean;

    /**
     * Whether the folding gutter should be drawn
     */
    foldGutter?: boolean;

    /**
     * Whether the cursor should be drawn when a selection is active.
     */
    showCursorWhenSelecting?: boolean;

    /**
     * When fixedGutter is on, and there is a horizontal scrollbar, by default
     * the gutter will be visible to the left of this scrollbar. If this
     * option is set to true, it will be covered by an element with class
     * CodeMirror-gutter-filler.
     */
    coverGutterNextToScrollbar?: boolean;

    /**
     * Controls whether drag-and-drop is enabled.
     */
    dragDrop?: boolean;

    /**
     * Explicitly set the line separator for the editor.
     * By default (value null), the document will be split on CRLFs as well as
     * lone CRs and LFs, and a single LF will be used as line separator in all
     * output (such as getValue). When a specific string is given, lines will
     * only be split on that string, and output will, by default, use that
     * same separator.
     */
    lineSeparator?: string | null;

    /**
     * Chooses a scrollbar implementation. The default is "native", showing
     * native scrollbars. The core library also provides the "null" style,
     * which completely hides the scrollbars. Addons can implement additional
     * scrollbar models.
     */
    scrollbarStyle?: string;

    /**
     * When enabled, which is the default, doing copy or cut when there is no
     * selection will copy or cut the whole lines that have cursors on them.
     */
    lineWiseCopyCut?: boolean;

    /**
     * Whether to scroll past the end of the buffer.
     */
    scrollPastEnd?: boolean;

    /**
     * Whether to give the wrapper of the line that contains the cursor the class
     * CodeMirror-activeline, adds a background with the class
     * CodeMirror-activeline-background, and adds the class
     * CodeMirror-activeline-gutter to the line's gutter space is enabled.
     */
    styleActiveLine: boolean; //| CodeMirror.StyleActiveLine;

    /**
     * Whether to causes the selected text to be marked with the CSS class
     * CodeMirror-selectedtext. Useful to change the colour of the selection
     * (in addition to the background).
     */
    styleSelectedText: boolean;

    /**
     * Defines the mouse cursor appearance when hovering over the selection.
     * It can be set to a string, like "pointer", or to true,
     * in which case the "default" (arrow) cursor will be used.
     */
    selectionPointer: boolean | string;
  }

  interface IExtensionBuilder {
    extensionBuilder: IExtensionBuilder;
  }

  abstract class ExtensionBuilderImpl<T> implements IExtensionBuilder {
    abstract of(value: T): Extension;

    get extensionBuilder(): IExtensionBuilder {
      return this;
    }
  }

  class FacetWrapper<T, U> extends ExtensionBuilderImpl<T> {
    constructor(facet: Facet<T, U>) {
      super();
      this._facet = facet;
    }

    of(value: T): Extension {
      return this._facet.of(value);
    }

    private _facet: Facet<T, U>;
  }

  class ConditionalExtension extends ExtensionBuilderImpl<boolean> {
    constructor(truthy: Extension, falsy: Extension = []) {
      super();
      this._truthy = truthy;
      this._falsy = falsy;
    }

    of(value: boolean): Extension {
      return value ? this._truthy : this._falsy;
    }

    private _truthy: Extension;
    private _falsy: Extension;
  }

  class GenConditionalExtension<T> extends ExtensionBuilderImpl<T> {
    constructor(
      fn: (a: T) => boolean,
      truthy: Extension,
      falsy: Extension = []
    ) {
      super();
      this._fn = fn;
      this._builder = new ConditionalExtension(truthy, falsy);
    }

    of(value: T): Extension {
      return this._builder.of(this._fn(value));
    }

    private _fn: (a: T) => boolean;
    private _builder: ConditionalExtension;
  }

  interface IConfigurableBuilder {
    compartment: Compartment;
    builder: IExtensionBuilder;
  }

  function createConfigurableBuilder<T, U>(
    facet: Facet<T, U>
  ): IConfigurableBuilder {
    return {
      compartment: new Compartment(),
      builder: new FacetWrapper<T, U>(facet)
    };
  }

  function createConditionalBuilder(
    truthy: Extension,
    falsy: Extension = []
  ): IConfigurableBuilder {
    return {
      compartment: new Compartment(),
      builder: new ConditionalExtension(truthy, falsy)
    };
  }

  function createGenConditionalBuilder<T>(
    fn: (value: T) => boolean,
    truthy: Extension,
    falsy: Extension = []
  ): IConfigurableBuilder {
    return {
      compartment: new Compartment(),
      builder: new GenConditionalExtension<T>(fn, truthy, falsy)
    };
  }

  export class EditorConfiguration {
    constructor() {
      this._configurableBuilderMap = new Map<string, IConfigurableBuilder>([
        ['tabSize', createConfigurableBuilder(EditorState.tabSize)],
        ['readOnly', createConfigurableBuilder(EditorState.readOnly)],
        ['keyMap', createConfigurableBuilder(keymap)],
        ['indentUnit', createConfigurableBuilder(indentUnit)],
        ['autoClosingBrackets', createConditionalBuilder(closeBrackets())],
        ['lineNumbers', createConditionalBuilder(gutter.lineNumbers())],
        [
          'lineWrap',
          createGenConditionalBuilder(
            (a: string) => a !== 'off',
            EditorView.lineWrapping
          )
        ]
      ]);
    }

    reconfigureExtension<T>(view: EditorView, key: string, value: T): void {
      const ext = this._configurableBuilderMap.get(key);
      if (ext) {
        view.dispatch({
          effects: ext.compartment.reconfigure(
            (ext.builder as ExtensionBuilderImpl<T>).of(value)
          )
        });
      }
    }

    reconfigureExtensions(view: EditorView, config: Partial<IConfig>): void {
      const eff = [];
      for (const [key, value] of Object.entries(config)) {
        const ext = this._configurableBuilderMap.get(key);
        if (ext) {
          eff.push(
            ext.compartment.reconfigure(
              (ext.builder as ExtensionBuilderImpl<typeof value>).of(value)
            )
          );
        }
      }
      view.dispatch({
        effects: eff
      });
    }

    injectExtension(view: EditorView, ext: Extension): void {
      view.dispatch({
        effects: StateEffect.appendConfig.of(ext)
      });
    }

    getInitialExtensions(config: IConfig): Extension[] {
      const keys = Object.keys(config).filter(
        v => v !== 'insertSpaces' && v !== 'extraKeys'
      );
      const extensions = [];
      for (const k of keys) {
        const ext = this._configurableBuilderMap.get(k);
        if (ext) {
          const val = config[k as keyof IConfig];
          const builder = ext.builder as ExtensionBuilderImpl<typeof val>;
          extensions.push(ext.compartment.of(builder.of(val)));
        }
      }

      let keymap_ext = keymap.of(
        config.extraKeys
          ? [...defaultKeymap, ...config.extraKeys!]
          : [...defaultKeymap]
      );
      let insert_ext = config.insertSpaces
        ? indentUnit.of(' '.repeat(config.tabSize))
        : indentUnit.of('\t');

      extensions.push(keymap_ext, insert_ext, defaultHighlightStyle);

      return extensions;
    }

    private _configurableBuilderMap: Map<string, IConfigurableBuilder>;
  }
}
