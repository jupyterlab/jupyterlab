import { style } from 'typestyle';
import SharedStyles from './shared-styles';

export namespace TagsToolStyleClasses {
  export const tagHeaderStyleClass = style({
    paddingLeft: '10px',
    paddingTop: '10px',
    paddingBottom: '4px',
    textTransform: 'uppercase',
    fontSize: '13px'
  });

  export const tagHeaderHrStyleClass = style({
    height: '0',
    border: '0',
    borderTop: 'var(--jp-border-width) solid var(--jp-border-color2)',
    paddingTop: '0px',
    marginTop: '0px'
  });

  export const cancelButtonStyleClass = style(
    SharedStyles.confirmButtonProperties,
    {
      color: 'var(--jp-content-font-color0)'
    }
  );

  export const deleteButtonStyleClass = style(
    SharedStyles.confirmButtonProperties,
    {
      color: 'var(--jp-ui-inverse-font-color0)',
      backgroundColor: '#bdbdbd'
    }
  );

  export const tagOperationsPopUpStyleClass = style(
    SharedStyles.tagOperationsProperties
  );

  export const bottomElementStyleClass = style({
    marginBottom: '20px'
  });

  export const tagOperationsOptionStyleClass = style(
    {
      $nest: {
        '&:hover': {
          backgroundColor: 'var(--jp-layout-color2)'
        }
      }
    },
    SharedStyles.tagOperationsProperties
  );

  export const tagOperationsNoSelectedStyleClass = style(
    SharedStyles.tagOperationsProperties,
    {
      color: '#A8A8A8',
      fontWeight: 'lighter'
    }
  );
}
