import { kernelIcon, LabIcon } from '@jupyterlab/ui-components';
import {
  Dialog,
  ICommandPalette,
  IThemeManager,
  showDialog
} from '@jupyterlab/apputils';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PLUGIN_ID } from '../../../tokens';
import {
  ICompletionIconSet,
  ICompletionTheme,
  ILSPCompletionThemeManager
} from './types';
import { render_themes_list } from './about';

export class CompletionThemeManager implements ILSPCompletionThemeManager {
  protected current_icons: Map<string, LabIcon>;
  protected themes: Map<string, ICompletionTheme>;
  private current_theme_id: string;
  private icons_cache: Map<string, LabIcon>;

  constructor(protected themeManager: IThemeManager) {
    this.themes = new Map();
    this.icons_cache = new Map();
    themeManager.themeChanged.connect(this.update_icons_set, this);
  }

  protected is_theme_light() {
    const current = this.themeManager.theme;
    if (!current) {
      // assume true by default
      return true;
    }
    return this.themeManager.isLight(current);
  }

  get_icons_set(
    theme: ICompletionTheme
  ): Map<keyof ICompletionIconSet, LabIcon> {
    const icons_sets = theme.icons;
    const dark_mode_and_dark_supported =
      !this.is_theme_light() && typeof icons_sets.dark !== 'undefined';
    const set: ICompletionIconSet = dark_mode_and_dark_supported
      ? icons_sets.dark
      : icons_sets.light;
    const icons: Map<keyof ICompletionIconSet, LabIcon> = new Map();
    const mode = this.is_theme_light() ? 'light' : 'dark';
    for (let [completion_kind, svg] of Object.entries(set)) {
      let name =
        'lsp:' + theme.id + '-' + completion_kind.toLowerCase() + '-' + mode;
      let icon: LabIcon;
      if (this.icons_cache.has(name)) {
        icon = this.icons_cache.get(name);
      } else {
        icon = new LabIcon({
          name: name,
          svgstr: svg
        });
        this.icons_cache.set(name, icon);
      }
      icons.set(completion_kind as keyof ICompletionIconSet, icon);
    }
    return icons;
  }

  protected update_icons_set() {
    if (this.current_theme === null) {
      return;
    }
    this.current_icons = this.get_icons_set(this.current_theme);
  }

  get_icon(type: string): LabIcon {
    if (this.current_theme === null) {
      return null;
    }
    let options = this.current_theme.icons.options || {};
    if (type) {
      type =
        type.substring(0, 1).toUpperCase() + type.substring(1).toLowerCase();
    }
    if (this.current_icons.has(type)) {
      return this.current_icons.get(type).bindprops(options);
    }
    if (type === 'Kernel') {
      return kernelIcon;
    }
    return null;
  }

  protected get current_theme_class() {
    return 'lsp-completer-theme-' + this.current_theme_id;
  }

  set_theme(id: string | null) {
    if (this.current_theme_id) {
      document.body.classList.remove(this.current_theme_class);
    }
    if (!this.themes.has(id)) {
      console.warn(
        `[LSP][Completer] Icons theme ${id} cannot be set yet (it may be loaded later).`
      );
    }
    this.current_theme_id = id;
    document.body.classList.add(this.current_theme_class);
    this.update_icons_set();
  }

  protected get current_theme(): ICompletionTheme | null {
    if (this.themes.has(this.current_theme_id)) {
      return this.themes.get(this.current_theme_id);
    }
    return null;
  }

  register_theme(theme: ICompletionTheme) {
    if (this.themes.has(theme.id)) {
      console.warn(
        'Theme with name',
        theme.id,
        'was already registered, overwriting.'
      );
    }
    this.themes.set(theme.id, theme);
    this.update_icons_set();
  }

  /**
   * Display the registered themes in a dialog,
   * both for the user to know what they can choose from,
   * and for the developer to quickly check how the icons
   * from each theme would look rendered.
   */
  display_themes() {
    showDialog({
      title: 'LSP Completer Themes',
      body: render_themes_list({
        themes: [...this.themes.values()],
        current: this.current_theme,
        get_set: this.get_icons_set.bind(this)
      }),
      buttons: [Dialog.okButton()]
    }).catch(console.warn);
  }
}

const LSP_CATEGORY = 'Language server protocol';

export const COMPLETION_THEME_MANAGER: JupyterFrontEndPlugin<ILSPCompletionThemeManager> = {
  id: PLUGIN_ID + ':ILSPCompletionThemeManager',
  requires: [IThemeManager, ICommandPalette],
  activate: (
    app,
    themeManager: IThemeManager,
    commandPalette: ICommandPalette
  ) => {
    let manager = new CompletionThemeManager(themeManager);
    app.commands.addCommand('lsp-completer-about-themes', {
      label: 'Display the completer themes',
      execute: () => {
        manager.display_themes();
      }
    });
    commandPalette.addItem({
      category: LSP_CATEGORY,
      command: 'lsp-completer-about-themes'
    });
    return manager;
  },
  provides: ILSPCompletionThemeManager,
  autoStart: true
};
