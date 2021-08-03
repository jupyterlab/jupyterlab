import { style } from 'typestyle/lib';

export const progressCircleStyle = (
  width?: number | undefined,
  height?: number | undefined
): string =>
  style({
    $nest: {
      svg: {
        display: 'block',
        margin: '0 auto',
        width: width ? `${width}px` : `16px`,
        height: height ? `${height}px` : `16px`,
        alignSelf: 'normal'
      },
      path: {
       fill: 'var(--jp-inverse-layout-color3)'
      }
    }
  });

