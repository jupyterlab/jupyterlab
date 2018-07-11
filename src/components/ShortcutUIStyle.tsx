import {
  style
} from 'typestyle'

export const TopWhitespaceStyle = style (
  {
    content: " ",
    height: 'var(--jp-toolbar-micro-height)', 
    borderBottomWidth: 'var(--jp-border-width)',
    borderBottomColor: 'var(--jp-toolbar-border-color)',
    boxShadow: 'var(--jp-toolbar-box-shadow)',
    zIndex: 1,
    top: 0,
    left: 0,
    width: '100%',
    background: 'var(--jp-toolbar-background)',
    position: 'static',
  }
)