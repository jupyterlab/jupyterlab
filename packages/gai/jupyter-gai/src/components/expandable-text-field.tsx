import React, { useEffect, useRef, useState } from 'react';

export interface IExpandableTextFieldProps {
  label: string;
  collapsedTextMaxLength?: number;
  id?: string;
  text?: string;
  style?: React.CSSProperties;
  InputProps?: {
    startAdornment: JSX.Element;
  };
  helperText?: string;
  name?: string;
}

export function ExpandableTextField(
  props: IExpandableTextFieldProps
): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const { label, style, helperText, InputProps } = props;
  const textContainerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setExpanded(false);
    const el = textContainerRef.current;
    if (el?.offsetWidth && el?.scrollWidth) {
      setOverflowing(el.offsetWidth < el.scrollWidth);
    }
  }, [props.text]);

  return (
    <div
      id={props.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      <span className="jp-gai-ExpandableTextField-label">{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          {InputProps?.startAdornment}
          <span
            className={`jp-gai-ExpandableTextField-value ${
              expanded
                ? 'jp-gai-ExpandableTextField-value-expanded'
                : 'jp-gai-ExpandableTextField-value-collapsed'
            }`}
            ref={textContainerRef}
          >
            {props.text ? props.text : !InputProps?.startAdornment && '\u2014'}
          </span>
        </div>
        {overflowing && (
          <div
            style={{ textDecoration: 'underline' }}
            onClick={() => setExpanded(!expanded)}
            className="jp-gai-ExpandableTextField-value"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </div>
        )}
        <span
          className="jp-gai-ExpandableTextField-label"
          style={{ maxWidth: 'fit-content' }}
        >
          {helperText}
        </span>
      </div>
    </div>
  );
}
