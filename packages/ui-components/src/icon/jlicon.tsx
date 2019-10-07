import React from 'react';
import { classes } from 'typestyle';
import { iconStyle, IIconStyle } from '../style/icon';

export class JLIcon<
  P extends JLIcon.IProps & { tag?: 'div' | 'span' } = JLIcon.IProps & {
    tag?: 'div' | 'span';
  },
  S extends JLIcon.IState = JLIcon.IState
> extends React.Component<P, S> {
  static resolveSvg(svgstr: string): HTMLElement | null {
    const parser = new DOMParser();
    const svgElement = parser.parseFromString(svgstr, 'image/svg+xml')
      .documentElement;

    if (svgElement.getElementsByTagName('parsererror').length > 0) {
      const errmsg = `SVG HTML was malformed for icon name: ${name}`;
      // parse failed, svgElement will be an error box
      if (this._debug) {
        // fail noisily, render the error box
        console.error(errmsg);
        return svgElement;
      } else {
        // bad svg is always a real error, fail silently but warn
        console.warn(errmsg);
        return null;
      }
    } else {
      // parse succeeded
      return svgElement;
    }
  }

  render() {
    const { className, title, tag, ...propsStyle } = this.props;
    const Tag: 'div' | 'span' = tag || 'div';

    // // ensure that svg html is valid
    // const svgElement = JLIcon.resolveSvg(this.props.svgstr);
    // if (!svgElement) {
    //   // bail if failing silently
    //   return <></>;
    // }

    if (title) {
      // TODO: reimplement setTitleSvg here
    }

    return (
      <Tag
        className={classes(className, propsStyle ? iconStyle(propsStyle) : '')}
        dangerouslySetInnerHTML={{
          __html: this.props.svgstr
          // __html: svgElement.outerHTML
        }}
      />
    );
  }

  static _debug: boolean = false;
}

/**
 * A namespace for JLIcon statics.
 */
export namespace JLIcon {
  /**
   * The input props for creating a new JLIcon
   */
  export interface IProps extends IIconStyle {
    /**
     * Extra classNames, used in addition to the typestyle className
     */
    className?: string;

    svgstr: string;

    /**
     * Icon title
     */
    title?: string;
  }

  export interface IProps {}

  /**
   * The state for a JLIcon component
   */
  export interface IState {}
}
