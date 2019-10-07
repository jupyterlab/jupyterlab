import React from 'react';
import { classes } from 'typestyle';
import { iconStyle, IIconStyle } from '../style/icon';

export function createIcon(svgstr: string, debug: boolean = false) {
  function resolveSvg(svgstr: string): HTMLElement | null {
    const parser = new DOMParser();
    const svgElement = parser.parseFromString(svgstr, 'image/svg+xml')
      .documentElement;

    if (svgElement.getElementsByTagName('parsererror').length > 0) {
      const errmsg = `SVG HTML was malformed for icon name: ${name}`;
      // parse failed, svgElement will be an error box
      if (debug) {
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

  return class JLIcon<
    P extends JLIcon.IProps = JLIcon.IProps,
    S extends JLIcon.IState = JLIcon.IState
  > extends React.Component<P, S> {
    render() {
      const { className, title, tag, ...propsStyle } = this.props;
      const Tag: 'div' | 'span' = tag || 'div';

      // ensure that svg html is valid
      const svgElement = resolveSvg(svgstr);
      if (!svgElement) {
        // bail if failing silently
        return <></>;
      }

      if (title) {
        // TODO: reimplement setTitleSvg here
      }

      return (
        <Tag
          className={classes(
            className,
            propsStyle ? iconStyle(propsStyle) : ''
          )}
          dangerouslySetInnerHTML={{
            __html: svgstr
            // __html: svgElement.outerHTML
          }}
        />
      );
    }
  };
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

    tag?: 'div' | 'span';

    /**
     * Icon title
     */
    title?: string;
  }

  /**
   * The state for a JLIcon component
   */
  export interface IState {}
}
