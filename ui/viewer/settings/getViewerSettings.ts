import van from "vanjs-core";
import { html, render } from "lit-html";
import type { Geometry } from "@awatif/components";
import type { Display } from "../../display/getDisplay";
import {
  addLineToGeometry,
  addNodeToGeometry,
  removeLineFromGeometry,
  removePointFromGeometry,
  updateLineEndpoints,
  updateNodeXYZ,
} from "./geometryTableActions";

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
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.09 0 .17 0 .26.02H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0 19.4 15Z"
    />
  </svg>
`;

type TableModal = null | "nodes" | "elements";

type DialogPos = { left: number; top: number };

function clampDialogPos(
  left: number,
  top: number,
  width: number,
  height: number,
): DialogPos {
  const pad = 8;
  return {
    left: Math.min(
      Math.max(pad, left),
      Math.max(pad, window.innerWidth - width - pad),
    ),
    top: Math.min(
      Math.max(pad, top),
      Math.max(pad, window.innerHeight - height - pad),
    ),
  };
}

export function getViewerSettings(
  display: Display,
  geometry?: Geometry,
): HTMLElement {
  const open = van.state(false);
  const tableModal = van.state<TableModal>(null);
  const nodesTablePos = van.state<DialogPos | null>(null);
  const elementsTablePos = van.state<DialogPos | null>(null);
  const root = document.createElement("div");
  root.className = "viewer-settings";

  const grid = display.grid;

  const closeTableModal = () => {
    tableModal.val = null;
  };

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (tableModal.val) {
      closeTableModal();
      return;
    }
    if (open.val) open.val = false;
  });

  const startDialogDrag = (e: PointerEvent, kind: "nodes" | "elements") => {
    const t = e.target as HTMLElement;
    if (t.closest(".viewer-settings__table-close")) return;
    const header = e.currentTarget as HTMLElement;
    const dialog = header.closest(".viewer-settings__table-dialog") as
      | HTMLElement
      | null;
    if (!dialog) return;
    e.preventDefault();
    header.setPointerCapture(e.pointerId);

    const r = dialog.getBoundingClientRect();
    const pos = kind === "nodes" ? nodesTablePos.val : elementsTablePos.val;
    const origLeft = pos?.left ?? r.left;
    const origTop = pos?.top ?? r.top;

    const onMove = (ev: PointerEvent) => {
      const dl = origLeft + (ev.clientX - e.clientX);
      const dt = origTop + (ev.clientY - e.clientY);
      const c = clampDialogPos(dl, dt, dialog.offsetWidth, dialog.offsetHeight);
      if (kind === "nodes") nodesTablePos.val = c;
      else elementsTablePos.val = c;
    };

    const onUp = (ev: PointerEvent) => {
      try {
        header.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const nodeDialogStyle = () => {
    const p = nodesTablePos.val;
    if (!p) return "left:50%;top:50%;transform:translate(-50%,-50%);";
    return `left:${p.left}px;top:${p.top}px;transform:none;`;
  };

  const elementDialogStyle = () => {
    const p = elementsTablePos.val;
    if (!p) return "left:50%;top:50%;transform:translate(-50%,-50%);";
    return `left:${p.left}px;top:${p.top}px;transform:none;`;
  };

  const template = () => {
    const nodeRows =
      geometry &&
      tableModal.val === "nodes" &&
      [...geometry.points.val.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, p]) => {
          const commitNodeRow = (ev: Event) => {
            if (!geometry) return;
            const tr = (ev.target as HTMLElement).closest("tr");
            if (!tr) return;
            const inputs = tr.querySelectorAll<HTMLInputElement>(
              ".viewer-settings__table-input",
            );
            const x = Number(inputs[0]?.value);
            const y = Number(inputs[1]?.value);
            const z = Number(inputs[2]?.value);
            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y) ||
              !Number.isFinite(z)
            ) {
              geometry.points.val = new Map(geometry.points.rawVal);
              return;
            }
            updateNodeXYZ(geometry, id, x, y, z);
          };
          return html`<tr>
            <td>${id}</td>
            <td>
              <input
                type="number"
                step="any"
                class="viewer-settings__table-input"
                .value=${String(p[0])}
                @keydown=${(ke: KeyboardEvent) => {
                  if (ke.key === "Enter")
                    (ke.target as HTMLInputElement).blur();
                }}
                @blur=${commitNodeRow}
              />
            </td>
            <td>
              <input
                type="number"
                step="any"
                class="viewer-settings__table-input"
                .value=${String(p[1])}
                @keydown=${(ke: KeyboardEvent) => {
                  if (ke.key === "Enter")
                    (ke.target as HTMLInputElement).blur();
                }}
                @blur=${commitNodeRow}
              />
            </td>
            <td>
              <input
                type="number"
                step="any"
                class="viewer-settings__table-input"
                .value=${String(p[2])}
                @keydown=${(ke: KeyboardEvent) => {
                  if (ke.key === "Enter")
                    (ke.target as HTMLInputElement).blur();
                }}
                @blur=${commitNodeRow}
              />
            </td>
            <td>
              <button
                type="button"
                class="viewer-settings__table-delete"
                aria-label="Delete node"
                @click=${() => {
                  if (!geometry) return;
                  removePointFromGeometry(geometry, id);
                }}
              >
                Delete
              </button>
            </td>
          </tr>`;
        });

    const elementRows =
      geometry &&
      tableModal.val === "elements" &&
      [...geometry.lines.val.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([lineId, line]) => {
          const commitElementRow = (ev: Event) => {
            if (!geometry) return;
            const tr = (ev.target as HTMLElement).closest("tr");
            if (!tr) return;
            const inputs = tr.querySelectorAll<HTMLInputElement>(
              ".viewer-settings__table-input",
            );
            const i = parseInt(inputs[0]?.value ?? "", 10);
            const j = parseInt(inputs[1]?.value ?? "", 10);
            const ok = updateLineEndpoints(geometry, lineId, i, j);
            if (!ok) geometry.lines.val = new Map(geometry.lines.rawVal);
          };
          return html`<tr>
            <td>${lineId}</td>
            <td>
              <input
                type="number"
                step="1"
                class="viewer-settings__table-input"
                .value=${String(line[0])}
                @keydown=${(ke: KeyboardEvent) => {
                  if (ke.key === "Enter")
                    (ke.target as HTMLInputElement).blur();
                }}
                @blur=${commitElementRow}
              />
            </td>
            <td>
              <input
                type="number"
                step="1"
                class="viewer-settings__table-input"
                .value=${String(line[1])}
                @keydown=${(ke: KeyboardEvent) => {
                  if (ke.key === "Enter")
                    (ke.target as HTMLInputElement).blur();
                }}
                @blur=${commitElementRow}
              />
            </td>
            <td>
              <button
                type="button"
                class="viewer-settings__table-delete"
                aria-label="Delete element"
                @click=${() => {
                  if (!geometry) return;
                  removeLineFromGeometry(geometry, lineId);
                }}
              >
                Delete
              </button>
            </td>
          </tr>`;
        });

    return html`
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
              ${geometry
                ? html`
                    <div class="viewer-settings__row viewer-settings__row--draw">
                      <span class="viewer-settings__node-heading">Draw</span>
                      <div
                        class="viewer-settings__draw-toggles"
                        role="group"
                        aria-label="Draw mode"
                      >
                        ${(
                          [
                            ["node", "Node"] as const,
                            ["element", "Element"] as const,
                            ["both", "Node + Element"] as const,
                          ] as const
                        ).map(
                          ([key, label]) => html`
                            <button
                              type="button"
                              class="viewer-settings__draw-toggle"
                              aria-pressed=${display.drawMode.val === key
                                ? "true"
                                : "false"}
                              @click=${() => {
                                const cur = display.drawMode.val;
                                display.drawMode.val = cur === key ? null : key;
                              }}
                            >
                              ${label}
                            </button>
                          `,
                        )}
                      </div>
                    </div>
                  `
                : null}
              <div class="viewer-settings__row viewer-settings__row--draw">
                <span class="viewer-settings__node-heading">View</span>
                <div
                  class="viewer-settings__draw-toggles"
                  role="group"
                  aria-label="View mode"
                >
                  ${(
                    [
                      ["2d", "2D"] as const,
                      ["3d", "3D"] as const,
                    ] as const
                  ).map(
                    ([key, label]) => html`
                      <button
                        type="button"
                        class="viewer-settings__draw-toggle"
                        aria-pressed=${display.viewMode.val === key
                          ? "true"
                          : "false"}
                        @click=${() => {
                          display.viewMode.val = key;
                        }}
                      >
                        ${label}
                      </button>
                    `,
                  )}
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
                ${geometry
                  ? html`<button
                      type="button"
                      class="viewer-settings__table-btn"
                      @click=${() => {
                        tableModal.val = "nodes";
                      }}
                    >
                      Table
                    </button>`
                  : null}
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
                ${geometry
                  ? html`<button
                      type="button"
                      class="viewer-settings__table-btn"
                      @click=${() => {
                        tableModal.val = "elements";
                      }}
                    >
                      Table
                    </button>`
                  : null}
              </div>
            </div>
          `
        : null}
      ${tableModal.val === "nodes" && geometry
        ? html`
            <div
              class="viewer-settings__table-backdrop"
              @click=${closeTableModal}
            >
              <div
                class="viewer-settings__table-dialog"
                style=${nodeDialogStyle()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="viewer-node-table-title"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <div
                  class="viewer-settings__table-header viewer-settings__table-header--drag"
                  @pointerdown=${(e: PointerEvent) => startDialogDrag(e, "nodes")}
                >
                  <h2 id="viewer-node-table-title" class="viewer-settings__table-title">
                    Nodes
                  </h2>
                  <button
                    type="button"
                    class="viewer-settings__table-close"
                    aria-label="Close"
                    @click=${closeTableModal}
                  >
                    ×
                  </button>
                </div>
                <div class="viewer-settings__table-scroll">
                  <table class="viewer-settings__table">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>X</th>
                        <th>Y</th>
                        <th>Z</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody class="viewer-settings__table-add-head">
                      <tr>
                        <td class="viewer-settings__table-foot-label">New</td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            class="viewer-settings__table-input viewer-settings__table-input--add"
                            placeholder="X"
                            @keydown=${(ke: KeyboardEvent) => {
                              if (ke.key === "Enter") {
                                ke.preventDefault();
                                (
                                  (ke.target as HTMLElement).closest("tr")?.querySelector(
                                    ".viewer-settings__table-add",
                                  ) as HTMLButtonElement | null
                                )?.click();
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            class="viewer-settings__table-input viewer-settings__table-input--add"
                            placeholder="Y"
                            @keydown=${(ke: KeyboardEvent) => {
                              if (ke.key === "Enter") {
                                ke.preventDefault();
                                (
                                  (ke.target as HTMLElement).closest("tr")?.querySelector(
                                    ".viewer-settings__table-add",
                                  ) as HTMLButtonElement | null
                                )?.click();
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            class="viewer-settings__table-input viewer-settings__table-input--add"
                            placeholder="Z"
                            @keydown=${(ke: KeyboardEvent) => {
                              if (ke.key === "Enter") {
                                ke.preventDefault();
                                (
                                  (ke.target as HTMLElement).closest("tr")?.querySelector(
                                    ".viewer-settings__table-add",
                                  ) as HTMLButtonElement | null
                                )?.click();
                              }
                            }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            class="viewer-settings__table-add"
                            @click=${(e: Event) => {
                              if (!geometry) return;
                              const row = (e.target as HTMLElement).closest(
                                "tr",
                              );
                              if (!row) return;
                              const inputs =
                                row.querySelectorAll<HTMLInputElement>(
                                  ".viewer-settings__table-input--add",
                                );
                              const x = Number(inputs[0]?.value);
                              const y = Number(inputs[1]?.value);
                              const zRaw = inputs[2]?.value?.trim() ?? "";
                              const z =
                                zRaw === "" ? 0 : Number(inputs[2]?.value);
                              if (!addNodeToGeometry(geometry, x, y, z)) return;
                              inputs[0]!.value = "";
                              inputs[1]!.value = "";
                              inputs[2]!.value = "";
                            }}
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                    <tbody>
                      ${nodeRows!.length
                        ? nodeRows
                        : html`<tr>
                            <td colspan="5" class="viewer-settings__table-empty">
                              No nodes
                            </td>
                          </tr>`}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `
        : null}
      ${tableModal.val === "elements" && geometry
        ? html`
            <div
              class="viewer-settings__table-backdrop"
              @click=${closeTableModal}
            >
              <div
                class="viewer-settings__table-dialog"
                style=${elementDialogStyle()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="viewer-element-table-title"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <div
                  class="viewer-settings__table-header viewer-settings__table-header--drag"
                  @pointerdown=${(e: PointerEvent) =>
                    startDialogDrag(e, "elements")}
                >
                  <h2
                    id="viewer-element-table-title"
                    class="viewer-settings__table-title"
                  >
                    Elements
                  </h2>
                  <button
                    type="button"
                    class="viewer-settings__table-close"
                    aria-label="Close"
                    @click=${closeTableModal}
                  >
                    ×
                  </button>
                </div>
                <div class="viewer-settings__table-scroll">
                  <table class="viewer-settings__table">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>iNode</th>
                        <th>jNode</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody class="viewer-settings__table-add-head">
                      <tr>
                        <td class="viewer-settings__table-foot-label">New</td>
                        <td>
                          <input
                            type="number"
                            step="1"
                            class="viewer-settings__table-input viewer-settings__table-input--add-el"
                            placeholder="iNode"
                            @keydown=${(ke: KeyboardEvent) => {
                              if (ke.key === "Enter") {
                                ke.preventDefault();
                                (
                                  (ke.target as HTMLElement).closest("tr")?.querySelector(
                                    ".viewer-settings__table-add",
                                  ) as HTMLButtonElement | null
                                )?.click();
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="1"
                            class="viewer-settings__table-input viewer-settings__table-input--add-el"
                            placeholder="jNode"
                            @keydown=${(ke: KeyboardEvent) => {
                              if (ke.key === "Enter") {
                                ke.preventDefault();
                                (
                                  (ke.target as HTMLElement).closest("tr")?.querySelector(
                                    ".viewer-settings__table-add",
                                  ) as HTMLButtonElement | null
                                )?.click();
                              }
                            }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            class="viewer-settings__table-add"
                            @click=${(e: Event) => {
                              if (!geometry) return;
                              const row = (e.target as HTMLElement).closest(
                                "tr",
                              );
                              if (!row) return;
                              const inputs =
                                row.querySelectorAll<HTMLInputElement>(
                                  ".viewer-settings__table-input--add-el",
                                );
                              const i = parseInt(inputs[0]?.value ?? "", 10);
                              const j = parseInt(inputs[1]?.value ?? "", 10);
                              if (!addLineToGeometry(geometry, i, j)) return;
                              inputs[0]!.value = "";
                              inputs[1]!.value = "";
                            }}
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                    <tbody>
                      ${elementRows!.length
                        ? elementRows
                        : html`<tr>
                            <td colspan="4" class="viewer-settings__table-empty">
                              No elements
                            </td>
                          </tr>`}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `
        : null}
    `;
  };

  van.derive(() => {
    if (geometry) {
      void geometry.points.val;
      void geometry.lines.val;
    }
    void open.val;
    void display.drawMode.val;
    void display.viewMode.val;
    void tableModal.val;
    void nodesTablePos.val;
    void elementsTablePos.val;
    void grid.visible.val;
    void grid.spacing.val;
    void display.nodeShowNumber.val;
    void display.nodeShowCoordinate.val;
    void display.elementShowNumber.val;
    render(template(), root);
  });

  return root;
}
