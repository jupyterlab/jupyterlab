import { style } from 'typestyle';
import SharedStyles from './shared-styles';

export namespace TagListStyleClasses {
  export const selectedTagStyleClass = style(SharedStyles.tagStyleProperties, {
    color: 'white',
    backgroundColor: '#2196F3',
    outline: 'none'
  });

  export const unselectedTagStyleClass = style(
    SharedStyles.tagStyleProperties,
    {
      backgroundColor: 'var(--jp-layout-color2)',
      outline: 'none'
    }
  );

  export const tagSubHeaderStyleClass = style({
    paddingLeft: '10px',
    marginBottom: '3px'
  });

  export const tagHolderStyleClass = style({
    display: 'flex',
    flexWrap: 'wrap',
    padding: '4px',
    height: 'fit-content',
    marginBottom: '20px',
    paddingRight: '10px'
  });
}
