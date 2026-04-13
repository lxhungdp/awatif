// Positions are in meters and forces are in Kilo-Newton,
// everything else propogate from these two assumptions
import van from "vanjs-core";
import {
  Components,
  getMesh,
  getLoads,
  getSupports,
  getReleases,
  getElementsProps,
  getReport,
  getPositionsAndForces,
  getDesigns,
  Geometry,
  Mesh,
  ComponentsType,
  LoadSelection,
  templates,
} from "@awatif/components";
import {
  getDisplay,
  getDocs,
  getLayout,
  getViewer,
  getComponents,
  Display,
  getCanvas,
  getCanvasBar,
  CanvasButtons,
  AnalysisStatus,
} from "@awatif/ui";

const geometry: Geometry = {
  points: van.state(new Map()),
  lines: van.state(new Map()),
  selection: van.state(null),
  designs: van.state(new Map()),
};

const components: Components = van.state(new Map());

const mesh: Mesh = {
  nodes: van.state([]),
  elements: van.state([]),
  geometryMapping: van.state({
    pointToNodes: new Map(),
    lineToElements: new Map(),
  }),
  loads: van.state(new Map()),
  supports: van.state(new Map()),
  releases: van.state(new Map()),
  elementsProps: van.state(new Map()),
  positions: van.state([]),
  displacements: van.state([]),
  internalForces: van.state(new Map()),
};

const display: Display = {
  grid: {
    visible: van.state(true),
    spacing: van.state(1),
  },
  nodeShowNumber: van.state(false),
  nodeShowCoordinate: van.state(false),
  elementShowNumber: van.state(false),
  displayScale: van.state(1),
  geometry: van.state(true),
  mesh: van.state(true),
  deformedShape: van.state(true),
  loads: van.state(true),
  supports: van.state(true),
  releases: van.state(true),
  memberIndex: van.state(false),
  extrudeSections: van.state(false),
  pointResult: van.state("None"),
  lineResult: van.state("None"),
  loadCase: van.state<LoadSelection>("dead"),
};

const analysisStatus: AnalysisStatus = van.state({ success: true });

// Analysis events
van.derive(() => {
  const assignedLineIds = new Set<number>();
  (components.val.get(ComponentsType.DESIGN) ?? []).forEach((c) =>
    c.geometry.forEach((id) => assignedLineIds.add(id)),
  );
  const unassignedLines = [...geometry.lines.val.keys()].filter(
    (id) => !assignedLineIds.has(id),
  );
  const warningPayload = unassignedLines.length > 0 ? { unassignedLines } : {};

  try {
    // Mesh events
    const meshData = getMesh({
      geometry: {
        points: geometry.points.val,
        lines: geometry.lines.val,
      },
      components: components.val,
      templates,
    });

    mesh.nodes.val = meshData.nodes;
    mesh.elements.val = meshData.elements;
    mesh.geometryMapping.val = meshData.geometryMapping;

    // Loads events
    mesh.loads.val = getLoads({
      components: components.val,
      geometryMapping: mesh.geometryMapping.val,
      templates,
      activeLoadCase: display.loadCase?.val,
      nodes: mesh.nodes.val,
      elements: mesh.elements.val,
    });

    // Supports events
    mesh.supports.val = getSupports({
      components: components.val,
      geometryMapping: mesh.geometryMapping.val,
      templates,
    });

    // Releases events
    mesh.releases.val = getReleases({
      components: components.val,
      geometryMapping: mesh.geometryMapping.val,
      templates,
    });

    // Elements properties events
    mesh.elementsProps.val = getElementsProps({
      components: components.val,
      geometryMapping: mesh.geometryMapping.val,
      templates,
    });

    // Positions events
    const { positions, internalForces } = getPositionsAndForces(
      mesh.nodes.val,
      mesh.elements.val,
      mesh.loads.val,
      mesh.supports.val,
      mesh.elementsProps.val,
      mesh.releases.val,
    );

    mesh.positions.val = positions;
    mesh.internalForces.val = internalForces;

    analysisStatus.val = { success: true, ...warningPayload };
  } catch (e) {
    mesh.positions.val = [];
    mesh.displacements.val = [];
    mesh.internalForces.val = new Map();

    analysisStatus.val = { success: false, ...warningPayload };
  }
});

// Designs events
van.derive(() => {
  geometry.designs.val = getDesigns({
    mesh: {
      nodes: mesh.nodes.val,
      elements: mesh.elements.val,
      geometryMapping: mesh.geometryMapping.val,
      internalForces: mesh.internalForces.val,
    },
    components: components.val,
    templates,
  });
});

// Components events
const componentsBarMode = van.state<ComponentsType | null>(null);
van.derive(() => {
  if (componentsBarMode.val === ComponentsType.LOADS) display.loads.val = true;
  if (componentsBarMode.val === ComponentsType.SUPPORTS)
    display.supports.val = true;
});

// Canvas events
const canvas = van.state<HTMLDivElement | null>(null);
const canvasButton = van.state<CanvasButtons | null>(null);
van.derive(() => {
  if (canvasButton.val === CanvasButtons.REPORT) {
    display.memberIndex.val = true;

    canvas.val = getReport({
      components: components.val,
      geometryMapping: mesh.geometryMapping.val,
      internalForces: mesh.internalForces.val,
      designs: geometry.designs.val,
      templates,
      activeLoadCase: display.loadCase?.val,
    });
  } else if (canvasButton.val === CanvasButtons.DOCS) {
    display.memberIndex.val = false;

    canvas.val = getDocs();
  } else {
    display.memberIndex.val = false;

    canvas.val = null;
  }
});

document.body.append(
  getLayout({
    viewer: getViewer({ geometry, mesh, components, display, templates }),
    display: getDisplay({ display }),
    header: [
      getCanvasBar({
        canvasButton,
        buttons: [CanvasButtons.DOCS, CanvasButtons.REPORT],
      }),
    ],
    canvas: getCanvas({ canvas, canvasButton }),
    components: getComponents({
      geometry,
      components,
      componentsBarMode,
      templates,
      loadCase: display.loadCase,
      analysisStatus,
      display,
    }),
  }),
);
