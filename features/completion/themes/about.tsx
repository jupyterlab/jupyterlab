import React, { ReactElement } from 'react';
import { ICompletionTheme, ILicenseInfo } from './types';
import { LabIcon } from '@jupyterlab/ui-components';

function render_licence(licence: ILicenseInfo): ReactElement {
  return (
    <div className={'lsp-licence'}>
      <a href={licence.link} title={licence.name}>
        {licence.abbreviation}
      </a>{' '}
      {licence.licensor}
    </div>
  );
}

type IconSetGetter = (theme: ICompletionTheme) => Map<string, LabIcon>;

function render_theme(
  theme: ICompletionTheme,
  get_set: IconSetGetter,
  is_current: boolean
): ReactElement {
  let icons: ReactElement[] = [];
  for (let [name, icon] of get_set(theme)) {
    icons.push(
      <div className={'lsp-completer-icon-row'}>
        <div>{name}</div>
        <div className={'jp-Completer-icon'}>
          <icon.react />
        </div>
      </div>
    );
  }
  return (
    <div className={'lsp-completer-themes'}>
      <h4>
        {theme.name}
        {is_current ? ' (current)' : ''}
      </h4>
      <ul>
        <li key={'id'}>
          ID: <code>{theme.id}</code>
        </li>
        <li key={'licence'}>Licence: {render_licence(theme.icons.licence)}</li>
        <li key={'dark'}>
          {typeof theme.icons.dark === 'undefined'
            ? ''
            : 'Includes dedicated dark mode icons set'}
        </li>
      </ul>
      <div className={'lsp-completer-theme-icons'}>{icons}</div>
    </div>
  );
}

export function render_themes_list(props: {
  themes: ICompletionTheme[];
  current: ICompletionTheme;
  get_set: IconSetGetter;
}): React.ReactElement {
  let themes = props.themes.map(theme =>
    render_theme(theme, props.get_set, theme == props.current)
  );
  return <div>{themes}</div>;
}
