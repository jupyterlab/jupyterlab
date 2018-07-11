import {
  style
} from 'typestyle'

export const CellStyle = style (
  {
    padding: '6px 12px',
    display: 'table-cell',
    width: '20%',
    lineHeight: 'var(--jp-code-line-height)',
    height: 'var(--jp-code-line-height)',
    verticalAlign: 'middle'
  }
)
  
export const ShortcutCellStyle = style (
  {
    display: 'flex',
    height: '25px'
  }
)

export const RowStyle = style(
  {
    height: '25px',
    padding: '10px',
    width: '100%',
    display: 'table-row',
    borderBottom: 'solid',
    borderBottomColor: 'var(--jp-border-color1)',
    borderBottomWidth: 'var(--jp-border-width)',
    lineHeight: '30px',
    verticalAlign: 'middle',
    backgroundColor: 'var(--jp-layout-color0)'
  }
)

export const ConflictRowStyle = style(
  {
    backgroundColor: 'var(--jp-error-color2)'
  }
)

export const ShortcutContainerStyle = style (
  {
    display: 'contents'
  }
)

export const ShortcutKeysContainerStyle = style (
  {
    fontFamily: 'var(--jp-code-font-family)',
    fontSize: 'var(--jp-code-font-size)',
    lineHeight: 'var(--jp-code-line-height)',
    display: 'flex'
  }
)

export const ShortcutKeysStyle = style (
  {
    borderWidth: 'var(--jp-border-width)',
    borderColor: 'var(--jp-border-color1)',
    background: 'var(--jp-layout-color2)',
    padding: '4px 6px 4px 6px',
    borderRadius: 'var(--jp-border-radius)'
  }
)

export const OrStyle = style (
  {
    marginRight: '12px',
    marginTop: '4px',
    lineHeight: 'var(--jp-code-line-height)'
  }
)

export const CommaStyle = style (
  {
    height: '16px',
    marginTop: '10px',
    marginRight: '2px',
    marginLeft: '2px',
  }
)

export const PlusStyle = style (
  {
    fontSize: 'var(--jp-ui-font-size2)',
    color: 'var(--jp-brand-color2)',
    transform: 'rotate(270deg)',
    lineHeight: 'var(--jp-code-line-height)',

    $nest: {
      '&:hover': {
        color: 'var(--jp-brand-color0)'
      },

      '&:focus': {
        color: 'var(--jp-brand-color0)'  
      }
    }
  }
)

export const ResetStyle = style (
  {
    color: 'var(--jp-brand-color2)',
    paddingLeft: '10px',

    $nest: {
      '&:hover': {
        textDecoration: 'underline'
      }
    }
  }
)

export const SourceCellStyle = style (
  {
    display: 'inline-block'
  }
)