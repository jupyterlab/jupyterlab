/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  type IMovableSectionDestination,
  IMovableSectionRegistry,
  type IMovableSectionSource
} from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import type {
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import type { AccordionLayout, AccordionPanel, Widget } from '@lumino/widgets';

/**
 * State DB key for persisting moved sections.
 */
const MOVE_STATE_KEY = 'section-mover:layout';

/**
 * Shape of the persisted state.
 * Keyed by target panel ID; each entry records ordered sections, their
 * absolute index in the destination accordion, and whether each was
 * collapsed when the state was saved.
 */
interface IMoveSectionsState {
  [targetId: string]: Array<{
    sourceId: string;
    sectionId: string;
    index?: number;
    collapsed?: true;
  }>;
}

namespace CommandIDs {
  export const moveSectionTo = 'apputils:move-section-to';
  export const moveSectionBack = 'apputils:move-section-back';
}

/**
 * Plugin that moves sections between any registered source sidebar
 * and target panel. Sources and targets announce themselves via
 * IMovableSectionRegistry.
 */
export const moveSectionsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:move-sections',
  description:
    'Enables moving sections between any registered source and target sidebars.',
  requires: [ITranslator],
  optional: [IMovableSectionRegistry, IStateDB],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    registry: IMovableSectionRegistry | null,
    stateDB: IStateDB | null
  ): void => {
    if (!registry) {
      return;
    }

    const trans = translator.load('jupyterlab');

    // section title element (in source sidebar) → section identity
    const titleToSection = new WeakMap<
      HTMLElement,
      { sourceId: string; sectionId: string }
    >();

    const widgetToInfo = new Map<
      Widget,
      {
        sourceId: string;
        sectionId: string;
        sourceLabel: string;
        targetId: string;
      }
    >();

    // For context-menu lookup
    const hostedTitleToWidget = new WeakMap<HTMLElement, Widget>();

    // Keyed by accordion instance so a recreated accordion (after the last
    // hosted section leaves and the FileBrowser disposes it) gets fresh
    // listeners on the next move-in.
    const dragSetupDone = new WeakSet<AccordionPanel>();
    const pendingSections = new Map<
      string,
      Map<string, { targetId: string; collapsed: boolean; index?: number }>
    >();

    // Capture last right-clicked element before the context menu opens
    let lastContextEl: HTMLElement | null = null;
    document.addEventListener(
      'contextmenu',
      (ev: MouseEvent) => {
        lastContextEl = ev.target as HTMLElement;
      },
      true
    );

    const saveState = async (): Promise<void> => {
      if (!stateDB) {
        return;
      }
      const state: IMoveSectionsState = {};
      for (const [targetId, { panel }] of registry.getTargets()) {
        const accordion = panel.accordionPanel;
        const allWidgets = accordion ? Array.from(accordion.widgets) : [];
        const sections = panel.sections
          .map(w => {
            const info = widgetToInfo.get(w);
            if (!info || info.targetId !== targetId) {
              return null;
            }
            // Detect collapsed state: widget content is hidden when collapsed
            const isCollapsed = w.isHidden;
            const index = allWidgets.indexOf(w);
            return {
              sourceId: info.sourceId,
              sectionId: info.sectionId,
              ...(index >= 0 ? { index } : {}),
              ...(isCollapsed ? { collapsed: true as const } : {})
            };
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);
        // Apply in saved accordion order so insertWidget on restore lands in
        // the right spot relative to non-moved widgets.
        sections.sort(
          (a, b) =>
            (a.index ?? Number.MAX_SAFE_INTEGER) -
            (b.index ?? Number.MAX_SAFE_INTEGER)
        );
        if (sections.length > 0) {
          state[targetId] = sections;
        }
      }
      await stateDB.save(
        MOVE_STATE_KEY,
        state as unknown as ReadonlyPartialJSONValue
      );
    };

    // Re-appending all titles in logical to fix keyboard Tab navigation.
    const syncTitleDOMOrder = (accordion: AccordionPanel): void => {
      const layout = accordion.layout as AccordionLayout;
      for (const title of layout.titles) {
        accordion.node.appendChild(title);
      }
    };

    const addDragHandle = (widget: Widget, accordion: AccordionPanel): void => {
      const idx = Array.from(accordion.widgets).indexOf(widget);
      if (idx < 0) {
        return;
      }
      const titleEl = accordion.titles[idx];
      if (!titleEl.querySelector('.jp-movable-section-dragHandle')) {
        const handle = document.createElement('span');
        handle.className = 'jp-movable-section-dragHandle';
        titleEl.prepend(handle);
      }
    };

    const setupAccordionDrag = (accordion: AccordionPanel): void => {
      if (dragSetupDone.has(accordion)) {
        return;
      }
      dragSetupDone.add(accordion);

      // Persist collapse/expand state whenever the user toggles a section.
      accordion.expansionToggled.connect(() => void saveState());

      let draggedWidget: Widget | null = null;
      let startY = 0;
      let isDragging = false;

      const indicator = document.createElement('div');
      indicator.className = 'jp-movable-section-dropIndicator';
      indicator.style.display = 'none';
      accordion.node.appendChild(indicator);

      const getTargetSlot = (clientY: number): number => {
        const layout = accordion.layout as AccordionLayout;
        const titles = Array.from(layout.titles);
        for (let i = 0; i < titles.length; i++) {
          const rect = titles[i].getBoundingClientRect();
          if (clientY < rect.top + rect.height / 2) {
            return i;
          }
        }
        return titles.length;
      };

      const showIndicator = (targetSlot: number): void => {
        const layout = accordion.layout as AccordionLayout;
        const titles = Array.from(layout.titles);
        const panelRect = accordion.node.getBoundingClientRect();
        let top: number;
        if (targetSlot < titles.length) {
          top = titles[targetSlot].getBoundingClientRect().top - panelRect.top;
        } else {
          const last = titles[titles.length - 1].getBoundingClientRect();
          top = last.bottom - panelRect.top;
        }
        indicator.style.top = `${top}px`;
        indicator.style.display = 'block';
      };

      const endDrag = (clientY?: number): void => {
        indicator.style.display = 'none';
        accordion.node.classList.remove('jp-mod-dragging');
        if (isDragging && draggedWidget && clientY !== undefined) {
          const currentIdx = Array.from(accordion.widgets).indexOf(
            draggedWidget
          );
          const targetSlot = getTargetSlot(clientY);
          const insertIdx =
            targetSlot > currentIdx ? targetSlot - 1 : targetSlot;
          if (insertIdx !== currentIdx) {
            accordion.insertWidget(insertIdx, draggedWidget);
            syncTitleDOMOrder(accordion);
            void saveState();
          }
        }
        draggedWidget = null;
        isDragging = false;
      };

      accordion.node.addEventListener('pointerdown', (event: PointerEvent) => {
        const target = event.target as HTMLElement;
        const titleEl = target.closest(
          '.jp-AccordionPanel-title'
        ) as HTMLElement | null;
        if (!titleEl || !target.closest('.jp-movable-section-dragHandle')) {
          return;
        }
        const layout = accordion.layout as AccordionLayout;
        const idx = Array.from(layout.titles).indexOf(titleEl);
        if (idx < 0) {
          return;
        }
        draggedWidget = accordion.widgets[idx];
        startY = event.clientY;
        accordion.node.setPointerCapture(event.pointerId);
      });

      accordion.node.addEventListener('pointermove', (event: PointerEvent) => {
        if (!draggedWidget) {
          return;
        }
        if (!isDragging && Math.abs(event.clientY - startY) > 5) {
          isDragging = true;
          accordion.node.classList.add('jp-mod-dragging');
        }
        if (isDragging) {
          showIndicator(getTargetSlot(event.clientY));
        }
      });

      accordion.node.addEventListener('pointerup', (event: PointerEvent) => {
        endDrag(event.clientY);
      });

      accordion.node.addEventListener('pointercancel', () => {
        endDrag();
      });
    };

    // Core move operations

    const applyMoveToTarget = (
      widget: Widget,
      sourceId: string,
      sectionId: string,
      sourceLabel: string,
      targetId: string,
      targetPanel: IMovableSectionDestination,
      collapsed = false,
      index?: number
    ): void => {
      // Capture hidden state before reparenting
      const wasHidden = widget.isHidden;
      targetPanel.addSection(widget);

      widgetToInfo.set(widget, { sourceId, sectionId, sourceLabel, targetId });

      const accordion = targetPanel.accordionPanel;
      if (accordion) {
        if (typeof index === 'number') {
          const total = accordion.widgets.length;
          const target = Math.max(0, Math.min(index, total - 1));
          if (accordion.widgets[target] !== widget) {
            accordion.insertWidget(target, widget);
            syncTitleDOMOrder(accordion);
          }
        }

        setupAccordionDrag(accordion);
        addDragHandle(widget, accordion);

        const idx = Array.from(accordion.widgets).indexOf(widget);
        if (idx >= 0) {
          const hostedTitle = accordion.titles[idx];
          hostedTitle.classList.add('jp-hosted-section');
          hostedTitleToWidget.set(hostedTitle, widget);

          if (wasHidden || collapsed) {
            // Ensure the content widget is actually hidden (needed when
            // restoring state where the widget was expanded in the source).
            widget.hide();
            hostedTitle.classList.remove('lm-mod-expanded');
            hostedTitle.setAttribute('aria-expanded', 'false');
          }
        }
      }
    };

    /**
     * Move a section from its source sidebar to a target panel.
     * Returns true on success, false if the section is not yet available.
     */
    const moveSection = (
      sourceId: string,
      sectionId: string,
      targetId: string,
      collapsed = false,
      index?: number
    ): boolean => {
      const sourceEntry = registry.getSources().get(sourceId);
      const targetEntry = registry.getTargets().get(targetId);
      if (!sourceEntry || !targetEntry) {
        return false;
      }
      const widget = sourceEntry.sidebar.removeSectionById(sectionId);
      if (!widget) {
        return false;
      }
      applyMoveToTarget(
        widget,
        sourceId,
        sectionId,
        sourceEntry.label,
        targetId,
        targetEntry.panel,
        collapsed,
        index
      );
      void saveState();
      return true;
    };

    const moveSectionBack = (widget: Widget): void => {
      const info = widgetToInfo.get(widget);
      if (!info) {
        return;
      }
      const sourceEntry = registry.getSources().get(info.sourceId);
      const targetEntry = registry.getTargets().get(info.targetId);
      if (!sourceEntry || !targetEntry) {
        return;
      }
      const isHidden = widget.isHidden;
      targetEntry.panel.removeSectionWidget(widget);
      sourceEntry.sidebar.reinsertSection(widget);
      widgetToInfo.delete(widget);

      // After reinsertion the accordion assigns a fresh title element.
      // Re-register it so the context menu works on this section again.
      const restored = sourceEntry.sidebar
        .getSections()
        .find(s => s.id === info.sectionId);
      if (restored) {
        restored.titleNode.classList.add('jp-movable-section');
        titleToSection.set(restored.titleNode, {
          sourceId: info.sourceId,
          sectionId: info.sectionId
        });
        if (isHidden) {
          restored.widget.hide();
          restored.titleNode.classList.remove('lm-mod-expanded');
          restored.titleNode.setAttribute('aria-expanded', 'false');
        }
      }

      void saveState();
    };

    // Source / target wiring

    const setupSource = (
      sourceId: string,
      source: IMovableSectionSource
    ): void => {
      for (const section of source.getSections()) {
        section.titleNode.classList.add('jp-movable-section');
        titleToSection.set(section.titleNode, {
          sourceId,
          sectionId: section.id
        });
      }

      source.sectionAdded.connect((_sender, section) => {
        section.titleNode.classList.add('jp-movable-section');
        titleToSection.set(section.titleNode, {
          sourceId,
          sectionId: section.id
        });

        // Fulfill any pending state restoration for this section
        const pending = pendingSections.get(sourceId);
        if (pending?.has(section.id)) {
          const { targetId, collapsed, index } = pending.get(section.id)!;
          pending.delete(section.id);
          if (pending.size === 0) {
            pendingSections.delete(sourceId);
          }
          moveSection(sourceId, section.id, targetId, collapsed, index);
        }
      });
    };

    const setupTarget = (
      targetId: string,
      targetLabel: string,
      panel: IMovableSectionDestination
    ): void => {
      app.contextMenu.addItem({
        command: CommandIDs.moveSectionTo,
        args: { targetId, targetLabel },
        selector: '.jp-movable-section',
        rank: 10
      });

      if (panel.accordionPanel && panel.sections.length > 0) {
        setupAccordionDrag(panel.accordionPanel);
      }
    };

    app.commands.addCommand(CommandIDs.moveSectionTo, {
      label: (args: ReadonlyPartialJSONObject) =>
        trans.__('Move to %1', (args.targetLabel as string) ?? ''),
      describedBy: {
        args: {
          type: 'object',
          properties: {
            targetId: { type: 'string' },
            targetLabel: { type: 'string' }
          }
        }
      },
      isVisible: (args: ReadonlyPartialJSONObject) => {
        if (!lastContextEl) {
          return false;
        }
        const titleEl = lastContextEl.closest(
          '.jp-movable-section'
        ) as HTMLElement | null;
        if (!titleEl) {
          return false;
        }
        // A title currently hosting a moved-in section is not a valid source —
        // it should only offer "Move back".
        if (titleEl.classList.contains('jp-hosted-section')) {
          return false;
        }
        const sectionInfo = titleToSection.get(titleEl);
        if (!sectionInfo) {
          return false;
        }
        const targetId = args.targetId as string;
        if (!targetId) {
          return false;
        }
        // Don't offer to move a section to the same panel it originates from
        const sourceEntry = registry.getSources().get(sectionInfo.sourceId);
        const targetEntry = registry.getTargets().get(targetId);
        if (!sourceEntry || !targetEntry) {
          return false;
        }
        return (
          (sourceEntry.sidebar as unknown) !== (targetEntry.panel as unknown)
        );
      },
      execute: (args: ReadonlyPartialJSONObject) => {
        const targetId = args.targetId as string;
        if (!targetId || !lastContextEl) {
          return;
        }
        const titleEl = lastContextEl.closest(
          '.jp-movable-section'
        ) as HTMLElement | null;
        if (!titleEl || titleEl.classList.contains('jp-hosted-section')) {
          return;
        }
        const sectionInfo = titleToSection.get(titleEl);
        if (!sectionInfo) {
          return;
        }
        moveSection(sectionInfo.sourceId, sectionInfo.sectionId, targetId);
      }
    });

    app.commands.addCommand(CommandIDs.moveSectionBack, {
      label: () => {
        if (!lastContextEl) {
          return trans.__('Move back');
        }
        const titleEl = lastContextEl.closest(
          '.jp-hosted-section'
        ) as HTMLElement | null;
        if (!titleEl) {
          return trans.__('Move back');
        }
        const widget = hostedTitleToWidget.get(titleEl);
        if (!widget) {
          return trans.__('Move back');
        }
        const info = widgetToInfo.get(widget);
        return info
          ? trans.__('Move back to %1', info.sourceLabel)
          : trans.__('Move back');
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      isVisible: () => {
        if (!lastContextEl) {
          return false;
        }
        const titleEl = lastContextEl.closest(
          '.jp-hosted-section'
        ) as HTMLElement | null;
        return titleEl ? hostedTitleToWidget.has(titleEl) : false;
      },
      execute: () => {
        if (!lastContextEl) {
          return;
        }
        const titleEl = lastContextEl.closest(
          '.jp-hosted-section'
        ) as HTMLElement | null;
        if (!titleEl) {
          return;
        }
        const widget = hostedTitleToWidget.get(titleEl);
        if (widget) {
          moveSectionBack(widget);
        }
      }
    });

    app.contextMenu.addItem({
      command: CommandIDs.moveSectionBack,
      selector: '.jp-hosted-section',
      rank: 10
    });

    // Bootstrap from registry

    for (const [id, { sidebar }] of registry.getSources()) {
      setupSource(id, sidebar);
    }
    for (const [id, { label, panel }] of registry.getTargets()) {
      setupTarget(id, label, panel);
    }

    registry.sourcePanelRegistered.connect((_sender, { id, sidebar }) => {
      setupSource(id, sidebar);
    });
    registry.targetPanelRegistered.connect((_sender, { id, label, panel }) => {
      setupTarget(id, label, panel);
    });

    // State restoration

    if (stateDB) {
      void stateDB.fetch(MOVE_STATE_KEY).then(value => {
        if (!value) {
          return;
        }
        const state = value as IMoveSectionsState;

        for (const [targetId, sections] of Object.entries(state)) {
          for (const { sourceId, sectionId, collapsed, index } of sections) {
            if (
              !moveSection(
                sourceId,
                sectionId,
                targetId,
                collapsed ?? false,
                index
              )
            ) {
              // Section not yet available — wait for sectionAdded signal
              if (!pendingSections.has(sourceId)) {
                pendingSections.set(sourceId, new Map());
              }
              pendingSections.get(sourceId)!.set(sectionId, {
                targetId,
                collapsed: collapsed ?? false,
                index
              });
            }
          }
        }
      });
    }
  }
};
