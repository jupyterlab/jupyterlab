// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanelReorderer, SidePanel } from '@jupyterlab/ui-components';
import { AccordionPanel, Widget } from '@lumino/widgets';

function pointerEvent(type: string, position: number): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: position,
    clientY: position
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

describe('AccordionPanelReorderer', () => {
  let panel: AccordionPanel;
  let reorderer: AccordionPanelReorderer;
  let widgets: Widget[];

  beforeEach(() => {
    panel = new AccordionPanel();
    widgets = ['First', 'Second', 'Third'].map(label => {
      const widget = new Widget();
      widget.title.label = label;
      panel.addWidget(widget);
      return widget;
    });
    panel.node.setPointerCapture = jest.fn();
    panel.node.hasPointerCapture = jest.fn(() => true);
    panel.node.releasePointerCapture = jest.fn();
    reorderer = AccordionPanelReorderer.get(panel);
    panel.titles.forEach((title, index) => {
      jest.spyOn(title, 'getBoundingClientRect').mockReturnValue({
        x: index * 100,
        y: index * 100,
        top: index * 100,
        left: index * 100,
        bottom: index * 100 + 30,
        right: index * 100 + 30,
        width: 30,
        height: 30,
        toJSON: () => ({})
      });
    });
  });

  afterEach(() => {
    panel.dispose();
  });

  function startDrag(): void {
    panel.titles[0]
      .querySelector('.jp-AccordionPanel-dragHandle')!
      .dispatchEvent(pointerEvent('pointerdown', 10));
    panel.node.dispatchEvent(pointerEvent('pointermove', 160));
  }

  it('should keep reordering disabled until explicitly enabled', () => {
    expect(reorderer.enabled).toBe(false);
    expect(AccordionPanelReorderer.get(panel)).toBe(reorderer);
    startDrag();
    panel.node.dispatchEvent(pointerEvent('pointerup', 160));
    expect(panel.widgets).toEqual(widgets);
  });

  it.each(['vertical', 'horizontal'] as const)(
    'should keep DOM and visual order aligned in %s panels',
    orientation => {
      panel.orientation = orientation;
      reorderer.enabled = true;
      const reordered = jest.fn();
      reorderer.reordered.connect(reordered);
      startDrag();
      panel.node.dispatchEvent(pointerEvent('pointerup', 160));
      expect(panel.widgets).toEqual([widgets[1], widgets[0], widgets[2]]);
      expect(Array.from(panel.node.querySelectorAll('h3'))).toEqual(
        panel.titles
      );
      expect(reordered).toHaveBeenCalledTimes(1);
    }
  );

  it('should restore handles after a title update or widget insertion', async () => {
    widgets[0].title.label = 'Updated';
    const widget = new Widget();
    panel.addWidget(widget);
    await Promise.resolve();
    for (const title of panel.titles) {
      expect(
        title.querySelectorAll('.jp-AccordionPanel-dragHandle')
      ).toHaveLength(1);
    }
  });

  it('should initialize handles for prepopulated SidePanel content', () => {
    reorderer.dispose();
    const sidebar = new SidePanel({ content: panel });
    expect(
      panel.node.querySelectorAll('.jp-AccordionPanel-dragHandle')
    ).toHaveLength(3);
    sidebar.dispose();
  });

  it.each(['pointercancel', 'lostpointercapture'])(
    'should cancel reordering on %s',
    type => {
      reorderer.enabled = true;
      startDrag();
      panel.node.dispatchEvent(pointerEvent(type, 160));
      panel.node.dispatchEvent(pointerEvent('pointerup', 160));
      expect(panel.widgets).toEqual(widgets);
      expect(panel.hasClass('jp-mod-dragging')).toBe(false);
    }
  );

  it('should cancel a drag when reordering is disabled', () => {
    reorderer.enabled = true;
    startDrag();
    reorderer.enabled = false;
    panel.node.dispatchEvent(pointerEvent('pointerup', 160));
    expect(panel.widgets).toEqual(widgets);
  });

  it('should release its resources when the panel is disposed', () => {
    panel.dispose();
    expect(reorderer.isDisposed).toBe(true);
    expect(AccordionPanelReorderer.find(panel.node)).toBeUndefined();
    expect(
      panel.node.querySelector('.jp-AccordionPanel-dropIndicator')
    ).toBeNull();
  });
});
