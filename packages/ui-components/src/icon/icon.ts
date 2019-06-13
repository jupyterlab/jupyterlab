/**
 * To add an icon to the defaultIconRegistry requires two lines of code:
 *   1. import the icon's .svg
 *
 *   2. add a relevant entry to _defaultIcons
 */

/* tslint:disable */
import jupyterFaviconSvg from '../../style/icons/jupyter-favicon.svg';

// filetype icons
import html5Svg from '../../style/icons/filetype/html5.svg';
import reactSvg from '../../style/icons/filetype/react.svg';

// statusbar icons
import kernelSvg from '../../style/icons/statusbar/kernel.svg';
import lineFormSvg from '../../style/icons/statusbar/line-form.svg';
import notTrustedSvg from '../../style/icons/statusbar/not-trusted.svg';
import statusBarSvg from '../../style/icons/statusbar/status-bar.svg';
import terminalSvg from '../../style/icons/statusbar/terminal.svg';
import trustedSvg from '../../style/icons/statusbar/trusted.svg';

// sidebar icons
import buildSvg from '../../style/icons/sidebar/build.svg'; // originally ic-build-24px.svg
import extensionSvg from '../../style/icons/sidebar/extension.svg'; // originally ic-extension-24px.svg
import folderSvg from '../../style/icons/sidebar/folder.svg'; // originally ic-folder-24px.svg
import paletteSvg from '../../style/icons/sidebar/palette.svg'; // originally ic-palette-24px.svg
import runningSvg from '../../style/icons/sidebar/running.svg'; // originally stop-circle.svg
import tabSvg from '../../style/icons/sidebar/tab.svg'; // originally ic-tab-24px.svg
/* tslint:enable */

export namespace Icon {
  export const defaultIcons: ReadonlyArray<IModel> = [
    { name: 'jupyter-favicon', svg: jupyterFaviconSvg },

    { name: 'html5', svg: html5Svg },
    { name: 'react', svg: reactSvg },

    { name: 'kernel', svg: kernelSvg },
    { name: 'line-form', svg: lineFormSvg },
    { name: 'not-trusted', svg: notTrustedSvg },
    { name: 'status-bar', svg: statusBarSvg },
    { name: 'terminal', svg: terminalSvg },
    { name: 'trusted', svg: trustedSvg },

    { name: 'build', svg: buildSvg },
    { name: 'extension', svg: extensionSvg },
    { name: 'folder', svg: folderSvg },
    { name: 'palette', svg: paletteSvg },
    { name: 'running', svg: runningSvg },
    { name: 'tab', svg: tabSvg }
  ];

  export interface IModel {
    name: string;
    className?: string;
    svg: string;
  }
}
