import { LabIcon } from '@jupyterlab/ui-components';

import codeCheckSvg from '../../style/icons/code-check.svg';
import codeClock from '../../style/icons/code-clock.svg';
import codeWarning from '../../style/icons/code-warning.svg';

export const codeWarningIcon = new LabIcon({
  name: 'lsp:codeWarning',
  svgstr: codeWarning
});
export const codeClockIcon = new LabIcon({
  name: 'lsp:codeClock',
  svgstr: codeClock
});

export const codeCheckIcon = new LabIcon({
  name: 'lsp:codeCheck',
  svgstr: codeCheckSvg
});
