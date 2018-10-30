declare class Tooltip {
	constructor(content?: string | Element, options?: any);

	content(content: string | Element): Tooltip;
	attach(element: Element): Tooltip;
	detach(): Tooltip;
	show(): Tooltip;
	hide(): Tooltip;
}
