declare module '@128technology/darsain-tooltip' {
  declare class Tooltip {
    element: Element;
    hidden: boolean;
    options: any;
    classes: any;
    constructor(content?: string | Element, options?: any);

    content(content: string | Element): Tooltip;
    attach(element: Element): Tooltip;
    detach(): Tooltip;
    show(): Tooltip;
    hide(): Tooltip;
    type(name: string): Tooltip;
    effect(name: string): Tooltip;
    changeClassType(propName: string, newClass: string): Tooltip;
    updateSize(): Tooltip;
    place(place: string): Tooltip;
    position(x: number | Element, y: number): Tooltip;
    toggle(): Tooltip;
    destroy(): void;
  }

  export = Tooltip;
}
