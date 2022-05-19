// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LabIcon } from '@jupyterlab/ui-components';

//template
// export const fooIcon = new LabIcon({
//     name: 'barpkg:foo',
//     svgstr: '<svg>...</svg>'
// });

import userIcon0Svgstr from '../../style/icons/user-icon-0.svg';
import userIcon1Svgstr from '../../style/icons/user-icon-1.svg';
import userIcon2Svgstr from '../../style/icons/user-icon-2.svg';
import userIcon3Svgstr from '../../style/icons/user-icon-3.svg';
import userIcon4Svgstr from '../../style/icons/user-icon-4.svg';
import userIcon5Svgstr from '../../style/icons/user-icon-5.svg';
import userIcon6Svgstr from '../../style/icons/user-icon-6.svg';
import userIcon7Svgstr from '../../style/icons/user-icon-7.svg';
import userIcon8Svgstr from '../../style/icons/user-icon-8.svg';
import userIcon9Svgstr from '../../style/icons/user-icon-9.svg';
import userIcon10Svgstr from '../../style/icons/user-icon-10.svg';
import userIcon11Svgstr from '../../style/icons/user-icon-11.svg';
import userIcon12Svgstr from '../../style/icons/user-icon-12.svg';
import userIcon13Svgstr from '../../style/icons/user-icon-13.svg';
import userIcon14Svgstr from '../../style/icons/user-icon-14.svg';
import userIcon15Svgstr from '../../style/icons/user-icon-15.svg';
import userIcon16Svgstr from '../../style/icons/user-icon-16.svg';
import userIcon17Svgstr from '../../style/icons/user-icon-17.svg';
import userIcon18Svgstr from '../../style/icons/user-icon-18.svg';
import userIcon19Svgstr from '../../style/icons/user-icon-19.svg';
import userIcon20Svgstr from '../../style/icons/user-icon-20.svg';
import userIcon21Svgstr from '../../style/icons/user-icon-21.svg';
import userIcon22Svgstr from '../../style/icons/user-icon-22.svg';
import userIcon23Svgstr from '../../style/icons/user-icon-23.svg';

const userIconSvgstrs = [
  userIcon0Svgstr,
  userIcon1Svgstr,
  userIcon2Svgstr,
  userIcon3Svgstr,
  userIcon4Svgstr,
  userIcon5Svgstr,
  userIcon6Svgstr,
  userIcon7Svgstr,
  userIcon8Svgstr,
  userIcon9Svgstr,
  userIcon10Svgstr,
  userIcon11Svgstr,
  userIcon12Svgstr,
  userIcon13Svgstr,
  userIcon14Svgstr,
  userIcon15Svgstr,
  userIcon16Svgstr,
  userIcon17Svgstr,
  userIcon18Svgstr,
  userIcon19Svgstr,
  userIcon20Svgstr,
  userIcon21Svgstr,
  userIcon22Svgstr,
  userIcon23Svgstr
];

export function randomIcon(): LabIcon {
  return UserIcons[Math.floor(Math.random() * UserIcons.length)];
}

export const UserIcons = userIconSvgstrs.map((svgstr, index) => {
  return new LabIcon({
    name: `UserIcon${index}`,
    svgstr
  });
});

export const CommentsHubIcon = new LabIcon({
  name: 'CommentsHubIcon',
  svgstr: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" fill="jp-icon2"/>
    <circle cx="10" cy="10" r="9.25" stroke="#616161" stroke-width="1.5"/>
    <path d="M9.74422 1C6.16412 4 1.15198 11.8 9.74422 19M10.2558 1C13.8359 4 18.848 11.8 10.2558 19" stroke="#616161" stroke-width="1.5"/>
    <path d="M19 9.84653C16 7.69847 8.2 4.69119 1 9.84653M19 10.1535C16 12.3015 8.2 15.3088 1 10.1535" stroke="#616161" stroke-width="1.5"/>
    <path d="M10 1V19" stroke="#616161" stroke-width="1.5"/>
  </svg>`
});

export const CommentsPanelIcon = new LabIcon({
  name: 'CommentsPanelIcon',
  svgstr: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="18" height="18" fill="none"/>
    <g clip-path="url(#clip0)">
      <path class="jp-icon3" d="M17.25 2.4C17.25 1.96239 17.0762 1.54271 16.7667 1.23327C16.4573 0.923839 16.0376 0.75 15.6 0.75L2.4 0.75C1.96239 0.75 1.54271 0.923839 1.23327 1.23327C0.923839 1.54271 0.75 1.96239 0.75 2.4L0.75 12.3C0.75 12.7376 0.923839 13.1573 1.23327 13.4667C1.54271 13.7762 1.96239 13.95 2.4 13.95H13.95L17.25 17.25V2.4ZM13.95 10.65H4.05V9H13.95V10.65ZM13.95 8.175H4.05V6.525H13.95V8.175ZM13.95 5.7H4.05V4.05H13.95V5.7Z" fill="#616161"/>
      <rect class="jp-icon3" x="0.75" y="12" width="16.5" height="2.25" fill="#616161"/>
      <rect class="jp-icon3" x="0.75" y="0.75" width="16.5" height="2.25" fill="#616161"/>
    </g>
    <defs>
      <clipPath id="clip0">
        <rect class="jp-icon3" width="16.5" height="16.5" fill="white" transform="translate(0.75 0.75)"/>
      </clipPath>
    </defs>
  </svg>`
});

export const CreateCommentIcon = new LabIcon({
  name: 'CreateCommentIcon',
  svgstr: `<svg class="jp-comments-IconShadow" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 18 18" width="18" height="18" style="enable-background:new 0 0 18 18;" xml:space="preserve">
    <path class="jp-icon3" fill="#616161" d="M0,0v14.4h14.4L18,18V0H0z M13.4,7.3H9.6v3.8H8.4V7.3H4.6V6.1h3.8V2.2h1.2v3.8h3.8V7.3z"/>
    <polygon class="jp-icon-accent0" fill="#616161" points="13.4,6.1 13.4,7.3 9.6,7.3 9.6,11.1 8.4,11.1 8.4,7.3 4.6,7.3 4.6,6.1 8.4,6.1 8.4,2.2 9.6,2.2 9.6,6.1 "/>
  </svg>`
});

export const OrangeCreateCommentIcon = new LabIcon({
  name: 'OrangeCreateCommentIcon',
  svgstr: `<svg class="jp-comments-IconShadow" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 18 18" width="18" height="18" style="enable-background:new 0 0 18 18;" xml:space="preserve">
    <path fill="#F57C00" d="M0,0v14.4h14.4L18,18V0H0z M13.4,7.3H9.6v3.8H8.4V7.3H4.6V6.1h3.8V2.2h1.2v3.8h3.8V7.3z"/>
    <polygon class="jp-icon-accent0" fill="#F57C00" points="13.4,6.1 13.4,7.3 9.6,7.3 9.6,11.1 8.4,11.1 8.4,7.3 4.6,7.3 4.6,6.1 8.4,6.1 8.4,2.2 9.6,2.2 9.6,6.1 "/>
  </svg>`
});

export const BlueCreateCommentIcon = new LabIcon({
  name: 'BlueCreateCommentIcon',
  svgstr: `<svg class="jp-comments-IconShadow" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 18 18" width="18" height="18" style="enable-background:new 0 0 18 18;" xml:space="preserve">
    <path fill="#1976D2" d="M0,0v14.4h14.4L18,18V0H0z M13.4,7.3H9.6v3.8H8.4V7.3H4.6V6.1h3.8V2.2h1.2v3.8h3.8V7.3z"/>
    <polygon class="jp-icon-accent0" fill="#1976D2" points="13.4,6.1 13.4,7.3 9.6,7.3 9.6,11.1 8.4,11.1 8.4,7.3 4.6,7.3 4.6,6.1 8.4,6.1 8.4,2.2 9.6,2.2 9.6,6.1 "/>
  </svg>`
});
