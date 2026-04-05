import { writable } from 'svelte/store';

export interface TooltipState {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

export const tooltipStore = writable<TooltipState>({ text: '', x: 0, y: 0, visible: false });

export function hideTooltip() {
  tooltipStore.update(s => ({ ...s, visible: false }));
}

/** Svelte action: use:tooltip={"text"} — hover on desktop, tap on mobile */
export function tooltip(node: HTMLElement, text: string) {
  let currentText = text;

  function show(e: MouseEvent | TouchEvent) {
    if (!currentText) return;
    let x: number, y: number;
    if (e instanceof TouchEvent && e.touches.length) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if (e instanceof MouseEvent) {
      x = e.clientX;
      y = e.clientY;
    } else return;

    tooltipStore.set({ text: currentText, x, y, visible: true });
    e.stopPropagation();
  }

  function hide() {
    tooltipStore.update(s => ({ ...s, visible: false }));
  }

  node.addEventListener('mouseenter', show);
  node.addEventListener('mouseleave', hide);
  node.addEventListener('touchstart', show, { passive: true });

  // Dismiss on scroll or any tap elsewhere (handled globally in layout)

  return {
    update(newText: string) { currentText = newText; },
    destroy() {
      node.removeEventListener('mouseenter', show);
      node.removeEventListener('mouseleave', hide);
      node.removeEventListener('touchstart', show);
    },
  };
}
