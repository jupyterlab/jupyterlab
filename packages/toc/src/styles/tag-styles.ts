import { style } from 'typestyle';
import SharedStyles from './shared-styles';

export namespace TagStyleClasses {
  export const tagLabelStyleClass = style({
    fontSize: '11px',
    maxWidth: '100%',
    textOverflow: 'ellipsis',
    display: 'inline-block',
    overflow: 'hidden',
    boxSizing: 'border-box',
    //paddingRight: '25px',
    paddingTop: '0px',
    marginTop: '-1px',
    marginBottom: '0px'
  });

  export const addTagStyleClass = style(SharedStyles.tagStyleProperties, {
    backgroundColor: 'var(--jp-layout-color1)',
    border: '1px solid var(--jp-layout-color4)',
    maxWidth: '95%',
    minHeight: '31px',
    maxHeight: '31px'
  });

  export const tagIconLabelStyleClass = style({
    position: 'absolute'
  });
}
