import van from "vanjs-core";
import { html, render } from "lit-html";
import type { Display } from "../../display/getDisplay";

import "./viewerSettings.css";

const gearSvg = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.09 0 .17 0 .26.02H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0 19.4 15a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.09 0 .17 0 .26.02H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0 19.4 15Z"
    />
  </svg>
`;

export function getViewerSettings(display: Display): HTMLElement {
  const open = van.state(false);
  const root = document.createElement("div");
  root.className = "viewer-settings";

  const grid = display.grid;

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && open.val) open.val = false;
  });

  const template = () => html`
    <button
      type="button"
      class="viewer-settings__btn"
      aria-expanded=${open.val ? "true" : "false"}
      aria-label="Settings"
      @click=${(e: Event) => {
        e.stopPropagation();
        open.val = !open.val;
      }}
    >
      ${gearSvg}
    </button>
    ${open.val
      ? html`
          <div
            class="viewer-settings__menu"
            role="menu"
            @click=${(e: Event) => e.stopPropagation()}
          >
            <div class="viewer-settings__row viewer-settings__row--grid">
              <label class="viewer-settings__inline-label">
                <input
                  type="checkbox"
                  .checked=${grid.visible.val}
                  @change=${(e: Event) =>
                    (grid.visible.val = (e.target as HTMLInputElement).checked)}
                />
                Grid
              </label>
              <div class="viewer-settings__spacing-inline">
                <span class="viewer-settings__spacing-text">Spacing</span>
                <input
                  class="viewer-settings__spacing-input"
                  type="number"
                  min="0.5"
                  step="0.5"
                  .value=${String(grid.spacing.val)}
                  @input=${(e: Event) => {
                    const v = Number((e.target as HTMLInputElement).value);
                    if (!Number.isFinite(v)) return;
                    grid.spacing.val = Math.max(0.5, v);
                  }}
                />
              </div>
            </div>
            <div class="viewer-settings__row viewer-settings__row--node">
              <span class="viewer-settings__node-heading">Node</span>
              <label class="viewer-settings__inline-label">
                <input
                  type="checkbox"
                  .checked=${display.nodeShowNumber.val}
                  @change=${(e: Event) =>
                    (display.nodeShowNumber.val = (
                      e.target as HTMLInputElement
                    ).checked)}
                />
                Number
              </label>
              <label class="viewer-settings__inline-label">
                <input
                  type="checkbox"
                  .checked=${display.nodeShowCoordinate.val}
                  @change=${(e: Event) =>
                    (display.nodeShowCoordinate.val = (
                      e.target as HTMLInputElement
                    ).checked)}
                />
                Coordinate
              </label>
            </div>
            <div class="viewer-settings__row viewer-settings__row--node">
              <span class="viewer-settings__node-heading">Element</span>
              <label class="viewer-settings__inline-label">
                <input
                  type="checkbox"
                  .checked=${display.elementShowNumber.val}
                  @change=${(e: Event) =>
                    (display.elementShowNumber.val = (
                      e.target as HTMLInputElement
                    ).checked)}
                />
                Number
              </label>
            </div>
          </div>
        `
      : null}
  `;

  van.derive(() => {
    render(template(), root);
  });

  return root;
}
