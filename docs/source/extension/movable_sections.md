# Making Sidebar Sections Movable

Any extension can let users move its accordion sections to another panel
(or receive sections from other panels) via a context-menu "Move to …" action.
There are two roles:

- **Source** — sections can be taken out of this panel (e.g. Running Sessions).
- **Target** — sections from other panels can be dropped into this panel (e.g. File Browser).

A panel can be both simultaneously.

---

## Registering

Take `IMovableSectionRegistry` as an **optional** dependency and call
`registerSource`, `registerTarget`, or both:

```typescript
import { IMovableSectionRegistry } from '@jupyterlab/apputils';

optional: [IMovableSectionRegistry]
activate: (app, registry: IMovableSectionRegistry | null) => {
  if (registry) {
    registry.registerSource('@my-org/my-ext:panel', 'My Panel', myPanel);
    registry.registerTarget('@my-org/my-ext:panel', 'My Panel', myPanel);
  }
}
```

The label appears in the context menu ("Move to My Panel" / "Move back to My Panel").

---

## IMovableSectionSource

Source panels must implement `IMovableSectionSource`. This interface lets the
move plugin read which sections are available, remove a section for transfer, and
re-insert it if the user moves it back.

### `getSections()`

Return every currently-available section together with its title DOM node.
The title node is used by the move plugin to attach the context-menu trigger:

```typescript
getSections(): ReadonlyArray<ISectionEntry> {
  const accordion = this.content as AccordionPanel;
  const result: ISectionEntry[] = [];
  for (const widget of this.widgets) {
    const idx = Array.from(accordion.widgets).indexOf(widget);
    if (idx >= 0 && accordion.titles[idx]) {
      result.push({ id: widget.id, widget, titleNode: accordion.titles[idx] });
    }
  }
  return result;
}
```

### `removeSectionById(id)`

Detach the section widget so it can be handed to the target panel:

```typescript
removeSectionById(id: string): Widget | null {
  const widget = this.widgets.find(w => w.id === id) ?? null;
  if (widget) widget.parent = null;
  return widget;
}
```

### `reinsertSection(widget)`

Called when the user moves a section back. Re-attach it to this panel:

```typescript
reinsertSection(widget: Widget): void {
  this.addWidget(widget);
}
```

### `sectionAdded`

Emit this signal after every new section is added. The move plugin listens to it
so it can attach context-menu CSS and fulfil deferred state restorations:

```typescript
private _sectionAdded = new Signal<this, ISectionEntry>(this);
get sectionAdded(): ISignal<this, ISectionEntry> { return this._sectionAdded; }

// after addWidget(widget):
const accordion = this.content as AccordionPanel;
const idx = Array.from(accordion.widgets).indexOf(widget);
if (idx >= 0 && accordion.titles[idx]) {
  this._sectionAdded.emit({ id: widget.id, titleNode: accordion.titles[idx], widget });
}
```

### `accordionPanel`

Expose the underlying `AccordionPanel` so the plugin can set up drag-to-reorder:

```typescript
get accordionPanel(): AccordionPanel {
  return this.content as AccordionPanel;
}
```

---

## IMovableSectionDestination

Destination panels must implement `IMovableSectionDestination`. This interface
lets the move plugin insert incoming sections and query what is currently hosted.

### `addSection(widget)` / `removeSectionWidget(widget)`

Add or remove a section widget. These are called when a section is moved in or out:

```typescript
addSection(widget: Widget): void          { this.addWidget(widget); }
removeSectionWidget(widget: Widget): void { widget.parent = null; }
```

### `sections` / `accordionPanel`

Expose the list of currently-hosted sections and the accordion that contains them:

```typescript
get sections(): ReadonlyArray<Widget>       { return this.widgets; }
get accordionPanel(): AccordionPanel | null { return this.content as AccordionPanel; }
```

---

> **Note — File Browser target**: The File Browser wraps sections in a lazily
> created `AccordionPanel` alongside its own file listing. If your target panel
> needs a similar split layout, refer to `packages/filebrowser/src/browser.ts`.
