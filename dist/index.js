// lib/get-wire-taper-polygon.ts
function hasWireTaper(point) {
  if (!point || typeof point !== "object") return false;
  return "route_type" in point && point.route_type === "wire" && ("start_width" in point || "end_width" in point || "width_interpolation_mode" in point);
}
function getWireTaperSegments(route) {
  const result = [];
  for (let i = 0; i < route.length - 1; i++) {
    const point = route[i];
    if (!hasWireTaper(point)) continue;
    const next = route[i + 1];
    if (!next) continue;
    const end = next.route_type === "through_pad" ? next.start : { x: next.x, y: next.y };
    const layer = next.route_type === "via" ? next.from_layer : next.route_type === "through_pad" ? next.start_layer : next.layer;
    if (!end || layer !== point.layer || point.width !== point.start_width)
      continue;
    const segment = {
      start: { x: point.x, y: point.y },
      end,
      start_width: point.start_width,
      end_width: point.end_width,
      width_interpolation_mode: point.width_interpolation_mode,
      layer: point.layer,
      is_inside_copper_pour: Boolean(
        point.is_inside_copper_pour && next.is_inside_copper_pour
      )
    };
    if (isValidWireTaperSegment(segment)) result.push(segment);
  }
  return result;
}
function getWireTaperPolygon(segment) {
  const { start, end, start_width: w0, end_width: w1 } = segment;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!isValidWireTaperSegment(segment)) return [];
  const delta = Math.abs(w1 - w0);
  const steps = segment.width_interpolation_mode === "linear" ? 1 : Math.max(
    1,
    Math.ceil(Math.sqrt(delta / (1e-3 + delta * 1e-6) * (3 / 8)))
  );
  const nx = -dy / length;
  const ny = dx / length;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = w0 <= w1 ? t : 1 - t;
    const width = segment.width_interpolation_mode === "quadratic" ? Math.min(w0, w1) + delta * u * u : w0 + (w1 - w0) * t;
    const halfWidth = width / 2;
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    left.push({ x: x + nx * halfWidth, y: y + ny * halfWidth });
    right.push({ x: x - nx * halfWidth, y: y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}
function isValidWireTaperSegment(segment) {
  const { start, end, start_width: w0, end_width: w1 } = segment;
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (![start.x, start.y, end.x, end.y, length, w0, w1].every(Number.isFinite) || length <= 0 || w0 <= 0 || w1 <= 0)
    return false;
  if (segment.width_interpolation_mode !== "linear" && segment.width_interpolation_mode !== "quadratic")
    return false;
  return true;
}

// lib/geometry.ts
import earcut from "earcut";
import polygonClipping from "polygon-clipping";
var MeshBuilder = class {
  constructor(color2 = [1, 1, 1, 1], element = 0, category = 0) {
    this.color = color2;
    this.element = element;
    this.category = category;
  }
  color;
  element;
  category;
  vertices = [];
  indices = [];
  polygon(rings) {
    if (!rings[0] || rings[0].length < 3) return;
    const points = [], holes = [];
    for (const [i, ring] of rings.entries()) {
      if (i) holes.push(points.length / 2);
      for (const p of ring) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
          throw new Error("Non-finite polygon vertex");
        points.push(p.x, p.y);
      }
    }
    const triangles = earcut(points, holes, 2), base = this.vertices.length / 8;
    for (let i = 0; i < points.length; i += 2)
      this.vertices.push(
        points[i],
        points[i + 1],
        ...this.color,
        this.element,
        this.category
      );
    for (const index of triangles) this.indices.push(base + index);
  }
  line(a, b, width) {
    if (!(width > 0)) return;
    const points = capsule(a, b, width);
    this.polygon([points]);
  }
  path(points, width, closed = false) {
    for (let i = 1; i < points.length; i++)
      this.line(points[i - 1], points[i], width);
    if (closed && points.length > 2) this.line(points.at(-1), points[0], width);
  }
  fabricationPath(points, width, filled) {
    if (points.length < 2) return;
    const polygons = [];
    if (filled && points.length >= 3)
      polygons.push([points.map((p) => [p.x, p.y])]);
    if (width > 0) {
      const route = filled ? [...points, points[0]] : points;
      for (let i = 1; i < route.length; i++)
        polygons.push([
          capsule(route[i - 1], route[i], width).map((p) => [p.x, p.y])
        ]);
    }
    if (!polygons.length) return;
    const snapped = polygons.map(
      (polygon) => polygon.map(
        (ring) => ring.map(([x, y]) => [
          Math.round(x * 1e9) / 1e9,
          Math.round(y * 1e9) / 1e9
        ])
      )
    );
    for (const polygon of polygonClipping.union(
      snapped[0],
      ...snapped.slice(1)
    ))
      this.polygon(polygon.map((ring) => ring.map(([x, y]) => ({ x, y }))));
  }
  build() {
    return {
      vertices: new Float32Array(this.vertices),
      indices: new Uint32Array(this.indices)
    };
  }
};
function capsule(a, b, width) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x), r = width / 2;
  const points = [];
  for (let i = 0; i <= 12; i++) {
    const t = angle + Math.PI / 2 + i * Math.PI / 12;
    points.push({ x: a.x + r * Math.cos(t), y: a.y + r * Math.sin(t) });
  }
  for (let i = 0; i <= 12; i++) {
    const t = angle - Math.PI / 2 + i * Math.PI / 12;
    points.push({ x: b.x + r * Math.cos(t), y: b.y + r * Math.sin(t) });
  }
  return points;
}
function rotate(p, center2, degrees = 0) {
  const t = degrees * Math.PI / 180, x = p.x - center2.x, y = p.y - center2.y;
  return {
    x: center2.x + x * Math.cos(t) - y * Math.sin(t),
    y: center2.y + x * Math.sin(t) + y * Math.cos(t)
  };
}
function ellipse(center2, width, height = width, rotation = 0) {
  if (!(width > 0 && height > 0)) return [];
  return Array.from({ length: 96 }, (_, i) => {
    const t = i * 2 * Math.PI / 96;
    return rotate(
      {
        x: center2.x + Math.cos(t) * width / 2,
        y: center2.y + Math.sin(t) * height / 2
      },
      center2,
      rotation
    );
  });
}
function rectangle(center2, width, height, radius = 0, rotation = 0) {
  if (!(width > 0 && height > 0)) return [];
  radius = Math.max(0, Math.min(radius, width / 2, height / 2));
  const points = [];
  for (let corner = 0; corner < 4; corner++) {
    const sx = corner === 0 || corner === 3 ? 1 : -1;
    const sy = corner < 2 ? 1 : -1;
    const steps = radius ? 24 : 1;
    for (let i = 0; i < steps; i++) {
      const t = (corner + i / (steps - 1 || 1)) * Math.PI / 2;
      points.push(
        rotate(
          {
            x: center2.x + sx * (width / 2 - radius) + radius * Math.cos(t),
            y: center2.y + sy * (height / 2 - radius) + radius * Math.sin(t)
          },
          center2,
          rotation
        )
      );
    }
  }
  return points;
}
function expandBrepRing(vertices) {
  const points = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    points.push({ x: a.x, y: a.y });
    const bulge = a.bulge ?? 0, dx = b.x - a.x, dy = b.y - a.y;
    if (!bulge || !dx && !dy) continue;
    const sweep = 4 * Math.atan(bulge);
    const center2 = {
      x: (a.x + b.x) / 2 - dy * (1 - bulge * bulge) / (4 * bulge),
      y: (a.y + b.y) / 2 + dx * (1 - bulge * bulge) / (4 * bulge)
    };
    const angle = Math.atan2(a.y - center2.y, a.x - center2.x), r = Math.hypot(a.x - center2.x, a.y - center2.y);
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 48)));
    for (let j = 1; j < steps; j++)
      points.push({
        x: center2.x + r * Math.cos(angle + sweep * j / steps),
        y: center2.y + r * Math.sin(angle + sweep * j / steps)
      });
  }
  return points;
}

// lib/draw-keepout.ts
function clip(points, offset, above) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = a.x + a.y - offset, db = b.x + b.y - offset;
    const insideA = above ? da >= 0 : da <= 0;
    const insideB = above ? db >= 0 : db <= 0;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = da / (da - db);
      result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return result;
}
function drawKeepout(mesh, rings) {
  const copperColor = mesh.color;
  const color2 = [
    copperColor[0] + (1 - copperColor[0]) * 0.4,
    copperColor[1] + (1 - copperColor[1]) * 0.4,
    copperColor[2] + (1 - copperColor[2]) * 0.4,
    copperColor[3]
  ];
  mesh.color = [color2[0], color2[1], color2[2], color2[3] * 0.2];
  mesh.polygon(rings);
  mesh.color = color2;
  const surface = new MeshBuilder();
  surface.polygon(rings);
  const halfWidth = 0.15 * Math.SQRT2 / 2;
  for (let i = 0; i < surface.indices.length; i += 3) {
    const triangle = surface.indices.slice(i, i + 3).map((index) => ({
      x: surface.vertices[index * 8],
      y: surface.vertices[index * 8 + 1]
    }));
    const offsets = triangle.map((p) => p.x + p.y);
    const start = Math.ceil(Math.min(...offsets) - halfWidth);
    const end = Math.floor(Math.max(...offsets) + halfWidth);
    for (let offset = start; offset <= end; offset++) {
      mesh.polygon([
        clip(
          clip(triangle, offset - halfWidth, true),
          offset + halfWidth,
          false
        )
      ]);
    }
  }
  mesh.color = copperColor;
}

// lib/colors.ts
import color from "color";
var rgb = (r, g, b) => [
  r / 255,
  g / 255,
  b / 255,
  1
];
var DEFAULT_LAYER_COLORS = {
  board: rgb(70, 72, 72),
  top: rgb(200, 52, 52),
  bottom: rgb(77, 127, 196),
  inner1: rgb(127, 200, 127),
  inner2: rgb(206, 125, 44),
  inner3: rgb(79, 203, 203),
  inner4: rgb(219, 98, 139),
  inner5: rgb(167, 165, 198),
  inner6: rgb(40, 204, 217),
  inner7: rgb(232, 178, 167),
  inner8: rgb(242, 237, 161),
  drill: rgb(255, 38, 226),
  top_silkscreen: rgb(242, 237, 161),
  bottom_silkscreen: rgb(242, 237, 161),
  soldermask_top: rgb(12, 55, 33),
  soldermask_bottom: rgb(12, 55, 33),
  top_fabrication: [1, 1, 1, 0.5],
  bottom_fabrication: [1, 1, 1, 0.5],
  top_notes: rgb(89, 148, 220),
  bottom_notes: rgb(89, 148, 220),
  top_courtyard: rgb(255, 0, 245),
  bottom_courtyard: rgb(38, 233, 255),
  edge_cuts: rgb(208, 210, 205)
};
var normalizeLayer = (layer) => layer.replace(/_copper$/, "");
function parseColor(value) {
  try {
    const parsed = color(value.trim().toLowerCase()).rgb();
    return [
      parsed.red() / 255,
      parsed.green() / 255,
      parsed.blue() / 255,
      parsed.alpha()
    ];
  } catch {
    throw new Error(`Unsupported color: ${value}`);
  }
}

// lib/text/fill-even-odd.ts
function contains(ring, p) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
function fillEvenOdd(mesh, rings) {
  const contours = rings.filter((r) => r.length >= 3).map((ring) => ({ ring, parents: [] }));
  for (const [i, c] of contours.entries())
    c.parents = contours.flatMap(
      (other, j) => i !== j && contains(other.ring, c.ring[0]) ? [j] : []
    );
  for (const [i, c] of contours.entries())
    if (c.parents.length % 2 === 0) {
      const holes = contours.filter(
        (h) => h.parents.length === c.parents.length + 1 && h.parents.includes(i)
      );
      mesh.polygon([c.ring, ...holes.map((h) => h.ring)]);
    }
}

// node_modules/circuit-to-canvas/lib/drawer/shapes/text/getAlphabetLayout.ts
import {
  glyphAdvanceRatio,
  kerningRatio,
  textMetrics
} from "@tscircuit/alphabet";
var getAdvanceRatio = (char) => glyphAdvanceRatio[char] ?? (char === " " ? textMetrics.spaceWidthRatio : textMetrics.glyphWidthRatio);
function getAlphabetAdvanceWidth(char, nextChar, fontSize) {
  const advanceRatio = getAdvanceRatio(char);
  const letterSpacingRatio = nextChar ? textMetrics.letterSpacingRatio : 0;
  const kerningAdjustmentRatio = nextChar ? kerningRatio[char]?.[nextChar] ?? 0 : 0;
  return fontSize * (advanceRatio + letterSpacingRatio + kerningAdjustmentRatio);
}
function getAlphabetLayout(text, fontSize) {
  const glyphWidth = fontSize * textMetrics.glyphWidthRatio;
  const letterSpacing = fontSize * textMetrics.letterSpacingRatio;
  const spaceWidth = fontSize * textMetrics.spaceWidthRatio;
  const strokeWidth = fontSize * textMetrics.strokeWidthRatio;
  const lineHeight = fontSize * textMetrics.lineHeightRatio;
  const lines = text.replace(/\\n/g, "\n").split("\n");
  const lineWidths = lines.map((line) => {
    const characters = Array.from(line);
    return characters.reduce(
      (sum, char, index) => sum + getAlphabetAdvanceWidth(char, characters[index + 1], fontSize),
      0
    );
  });
  const width = lineWidths.reduce(
    (maxWidth, lineWidth) => Math.max(maxWidth, lineWidth),
    0
  );
  const height = lines.length > 1 ? fontSize + (lines.length - 1) * lineHeight : fontSize;
  return {
    width,
    height,
    glyphWidth,
    letterSpacing,
    spaceWidth,
    strokeWidth,
    lineHeight,
    lines,
    lineWidths
  };
}

// node_modules/circuit-to-canvas/lib/drawer/shapes/text/getAlphabetOutlineGroups.ts
import glyphOutlineAlphabet from "@tscircuit/alphabet/outline-polygons";
function getAlphabetOutlineGroups(params) {
  const { line, fontSize, startX, startY } = params;
  const height = fontSize;
  const glyphScaleX = fontSize;
  const characters = Array.from(line);
  const groups = [];
  let cursor = startX + params.layout.strokeWidth / 2;
  characters.forEach((char, index) => {
    const glyphRings = glyphOutlineAlphabet[char];
    if (glyphRings?.length) {
      const rings = [];
      for (const ring of glyphRings) {
        const points = ring.map((point) => ({
          x: cursor + point.x * glyphScaleX,
          y: startY + (1 - point.y) * height
        }));
        if (points.length >= 3) rings.push(points);
      }
      if (rings.length > 0) groups.push(rings);
    }
    cursor += getAlphabetAdvanceWidth(char, characters[index + 1], fontSize);
  });
  return groups;
}

// node_modules/circuit-to-canvas/lib/drawer/shapes/text/getPolygonBounds.ts
function getPolygonBounds(polygons) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const polygon of polygons) {
    for (const point of polygon) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (minX === Number.POSITIVE_INFINITY || minY === Number.POSITIVE_INFINITY || maxX === Number.NEGATIVE_INFINITY || maxY === Number.NEGATIVE_INFINITY) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

// node_modules/circuit-to-canvas/lib/drawer/shapes/text/getTextStartPosition.ts
function getTextGeometry(alignment, layout, fontSize) {
  const baseLinePlacements = getBaseLinePlacements(alignment, layout);
  const baseGlyphGroups = getGlyphGroupsForLinePlacements(
    baseLinePlacements,
    layout,
    fontSize
  );
  const baseBounds = getPolygonBounds(baseGlyphGroups.flat());
  const startOffset = getStartOffset(alignment, layout, baseBounds);
  return {
    bounds: baseBounds ? translateBounds(baseBounds, startOffset) : null,
    glyphGroups: translateGlyphGroups(baseGlyphGroups, startOffset),
    linePlacements: baseLinePlacements.map(({ line, startX, startY }) => ({
      line,
      startX: startX + startOffset.x,
      startY: startY + startOffset.y
    })),
    startOffset
  };
}
function getApproximateTextStartPosition(alignment, layout) {
  const totalWidth = layout.width + layout.strokeWidth;
  const totalHeight = layout.height + layout.strokeWidth;
  let x = 0;
  let y = 0;
  if (alignment === "center" || alignment === "top_center" || alignment === "bottom_center") {
    x = -totalWidth / 2;
  } else if (alignment === "top_left" || alignment === "bottom_left" || alignment === "center_left") {
    x = 0;
  } else if (alignment === "top_right" || alignment === "bottom_right" || alignment === "center_right") {
    x = -totalWidth;
  } else if (alignment === "top_center" || alignment === "bottom_center") {
    x = -totalWidth / 2;
  }
  if (alignment === "center" || alignment === "center_left" || alignment === "center_right") {
    y = -totalHeight / 2;
  } else if (alignment === "top_left" || alignment === "top_right" || alignment === "top_center") {
    y = 0;
  } else if (alignment === "bottom_left" || alignment === "bottom_right" || alignment === "bottom_center") {
    y = -totalHeight;
  }
  return { x, y };
}
function getBaseLinePlacements(alignment, layout) {
  return layout.lines.map((line, lineIndex) => ({
    line,
    startX: getLineStartX({
      alignment,
      lineWidth: layout.lineWidths[lineIndex],
      maxWidth: layout.width,
      strokeWidth: layout.strokeWidth
    }),
    startY: lineIndex * layout.lineHeight
  }));
}
function getGlyphGroupsForLinePlacements(linePlacements, layout, fontSize) {
  return linePlacements.flatMap(
    ({ line, startX, startY }) => getAlphabetOutlineGroups({
      line,
      fontSize,
      startX,
      startY,
      layout
    })
  );
}
function getStartOffset(alignment, layout, bounds) {
  if (!bounds) {
    return getApproximateTextStartPosition(alignment, layout);
  }
  return {
    x: -getHorizontalAnchorPosition(alignment, bounds),
    y: -getVerticalAnchorPosition(alignment, bounds)
  };
}
function getHorizontalAnchorPosition(alignment, bounds) {
  if (alignment === "top_left" || alignment === "bottom_left" || alignment === "center_left") {
    return bounds.minX;
  }
  if (alignment === "top_right" || alignment === "bottom_right" || alignment === "center_right") {
    return bounds.maxX;
  }
  return (bounds.minX + bounds.maxX) / 2;
}
function getVerticalAnchorPosition(alignment, bounds) {
  if (alignment === "top_left" || alignment === "top_right" || alignment === "top_center") {
    return bounds.minY;
  }
  if (alignment === "bottom_left" || alignment === "bottom_right" || alignment === "bottom_center") {
    return bounds.maxY;
  }
  return (bounds.minY + bounds.maxY) / 2;
}
function translateGlyphGroups(glyphGroups, offset) {
  if (offset.x === 0 && offset.y === 0) {
    return glyphGroups;
  }
  return glyphGroups.map(
    (group) => group.map(
      (polygon) => polygon.map((point) => ({
        x: point.x + offset.x,
        y: point.y + offset.y
      }))
    )
  );
}
function translateBounds(bounds, offset) {
  return {
    minX: bounds.minX + offset.x,
    minY: bounds.minY + offset.y,
    maxX: bounds.maxX + offset.x,
    maxY: bounds.maxY + offset.y
  };
}
function getLineStartX(params) {
  const { alignment, lineWidth, maxWidth, strokeWidth } = params;
  const totalLineWidth = lineWidth + strokeWidth;
  const totalMaxWidth = maxWidth + strokeWidth;
  if (alignment === "top_left" || alignment === "bottom_left" || alignment === "center_left") {
    return 0;
  }
  if (alignment === "top_right" || alignment === "bottom_right" || alignment === "center_right") {
    return totalMaxWidth - totalLineWidth;
  }
  return (totalMaxWidth - totalLineWidth) / 2;
}

// lib/text/draw-pcb-note-text.ts
import { parse } from "opentype.js";

// lib/text/note-font-data.ts
var noteFontData = "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";

// lib/text/draw-pcb-note-text.ts
var defaultFont;
var customFonts = /* @__PURE__ */ new WeakMap();
function getFont(data) {
  if (data) {
    let cached = customFonts.get(data);
    if (!cached) {
      cached = { font: parse(data), outlines: /* @__PURE__ */ new Map() };
      customFonts.set(data, cached);
    }
    return cached;
  }
  return defaultFont ??= {
    font: parse(
      Uint8Array.from(atob(noteFontData), (char) => char.charCodeAt(0)).buffer
    ),
    outlines: /* @__PURE__ */ new Map()
  };
}
function getOutline(glyph, outlines) {
  const cached = outlines.get(glyph.index);
  if (cached) return cached;
  const rings = [];
  let ring = [];
  const finish = () => {
    if (ring.length > 2) rings.push(ring);
    ring = [];
  };
  for (const command of glyph.getPath(0, 0, 1).commands) {
    if (command.type === "M") {
      finish();
      ring.push({ x: command.x, y: command.y });
    } else if (command.type === "L") {
      ring.push({ x: command.x, y: command.y });
    } else if (command.type === "Z") {
      finish();
    } else {
      flattenCurve(ring, command);
    }
  }
  finish();
  outlines.set(glyph.index, rings);
  return rings;
}
function flattenCurve(ring, command) {
  const start = ring.at(-1);
  const points = [start, { x: command.x1, y: command.y1 }];
  if (command.type === "C") points.push({ x: command.x2, y: command.y2 });
  points.push({ x: command.x, y: command.y });
  const subdivide = (points2, depth = 0) => {
    const a = points2[0], b = points2.at(-1);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const flatness = Math.max(
      ...points2.slice(1, -1).map(
        (p) => length ? Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / length : Math.hypot(p.x - a.x, p.y - a.y)
      )
    );
    if (flatness <= 1 / 2048 || depth >= 12) {
      ring.push(b);
      return;
    }
    const left = [a], right = [b];
    let level = points2;
    while (level.length > 1) {
      level = level.slice(1).map((p, i) => ({
        x: (level[i].x + p.x) / 2,
        y: (level[i].y + p.y) / 2
      }));
      left.push(level[0]);
      right.unshift(level.at(-1));
    }
    subdivide(left, depth + 1);
    subdivide(right, depth + 1);
  };
  subdivide(points);
}
function drawPcbNoteText(mesh, note, yAxis, fontData) {
  const text = String(note.text ?? "");
  if (!text) return;
  const { font, outlines } = getFont(fontData);
  const fontSize = note.font_size ?? 1;
  const anchor = note.anchor_position ?? note.center ?? { x: note.x ?? 0, y: note.y ?? 0 };
  const alignment = note.anchor_alignment ?? "center";
  const baseline = (alignment.startsWith("top_") ? font.ascender : alignment.startsWith("bottom_") ? font.descender : (font.ascender + font.descender) / 2) / font.unitsPerEm * fontSize;
  const sign = yAxis === "up" ? -1 : 1;
  let y = baseline;
  for (const [index, line] of text.split("\n").entries()) {
    if (!line) continue;
    if (index > 0) y += fontSize;
    const width = font.getAdvanceWidth(line, fontSize);
    const x = alignment.endsWith("_left") ? 0 : alignment.endsWith("_right") ? -width : -width / 2;
    font.forEachGlyph(line, x, y, fontSize, {}, (glyph, x2, y2) => {
      fillEvenOdd(
        mesh,
        getOutline(glyph, outlines).map(
          (ring) => ring.map((p) => ({
            x: anchor.x + x2 + p.x * fontSize,
            y: anchor.y + sign * (y2 + p.y * fontSize)
          }))
        )
      );
    });
  }
}

// lib/text/draw-text.ts
function drawText(mesh, e, yAxis = "up", pcbNoteFont) {
  if (e.type === "pcb_note_text")
    return drawPcbNoteText(mesh, e, yAxis, pcbNoteFont);
  const text = String(e.text ?? "");
  if (!text) return;
  const c = e.anchor_position ?? e.center ?? { x: e.x ?? 0, y: e.y ?? 0 };
  const fontSize = e.font_size ?? 1;
  const layout = getAlphabetLayout(text, fontSize);
  const geometry = getTextGeometry(
    e.anchor_alignment ?? "center",
    layout,
    fontSize
  );
  const isFabrication = e.type === "pcb_fabrication_note_text";
  const mirrored = isFabrication ? false : e.type === "pcb_silkscreen_text" ? e.layer === "bottom" : e.is_mirrored ?? e.layer === "bottom";
  const rotation = isFabrication ? 0 : e.ccw_rotation ?? 0;
  const sign = yAxis === "up" ? -1 : 1;
  const transform2 = (p) => rotate(
    { x: c.x + (mirrored ? -p.x : p.x), y: c.y + sign * p.y },
    c,
    -sign * rotation
  );
  if (e.is_knockout && !isFabrication) {
    const b = geometry.bounds;
    if (!b) return;
    const p = {
      left: 0.2,
      right: 0.2,
      top: 0.2,
      bottom: 0.2,
      ...e.knockout_padding
    };
    const outer = [
      { x: b.minX - p.left, y: b.minY - p.top },
      { x: b.maxX + p.right, y: b.minY - p.top },
      { x: b.maxX + p.right, y: b.maxY + p.bottom },
      { x: b.minX - p.left, y: b.maxY + p.bottom }
    ];
    fillEvenOdd(mesh, [
      outer.map(transform2),
      ...geometry.glyphGroups.flatMap(
        (group) => group.map((ring) => ring.map(transform2))
      )
    ]);
    return;
  }
  for (const group of geometry.glyphGroups)
    fillEvenOdd(
      mesh,
      group.map((ring) => ring.map(transform2))
    );
}

// node_modules/@tscircuit/math-utils/dist/chunk-5J3PCV4D.js
function midpoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

// node_modules/transformation-matrix/src/applyToPoint.js
function applyToPoint(matrix, point) {
  return Array.isArray(point) ? [
    matrix.a * point[0] + matrix.c * point[1] + matrix.e,
    matrix.b * point[0] + matrix.d * point[1] + matrix.f
  ] : {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

// node_modules/transformation-matrix/src/utils.js
function isUndefined(val) {
  return typeof val === "undefined";
}

// node_modules/transformation-matrix/src/translate.js
function translate(tx, ty = 0) {
  return {
    a: 1,
    c: 0,
    e: tx,
    b: 0,
    d: 1,
    f: ty
  };
}

// node_modules/transformation-matrix/src/transform.js
function transform(...matrices) {
  matrices = Array.isArray(matrices[0]) ? matrices[0] : matrices;
  const multiply = (m1, m2) => {
    return {
      a: m1.a * m2.a + m1.c * m2.b,
      c: m1.a * m2.c + m1.c * m2.d,
      e: m1.a * m2.e + m1.c * m2.f + m1.e,
      b: m1.b * m2.a + m1.d * m2.b,
      d: m1.b * m2.c + m1.d * m2.d,
      f: m1.b * m2.e + m1.d * m2.f + m1.f
    };
  };
  switch (matrices.length) {
    case 0:
      throw new Error("no matrices provided");
    case 1:
      return matrices[0];
    case 2:
      return multiply(matrices[0], matrices[1]);
    default: {
      const [m1, m2, ...rest] = matrices;
      const m = multiply(m1, m2);
      return transform(m, ...rest);
    }
  }
}

// node_modules/transformation-matrix/src/rotate.js
var { cos, sin, PI } = Math;
function rotate2(angle, cx, cy) {
  const cosAngle = cos(angle);
  const sinAngle = sin(angle);
  const rotationMatrix = {
    a: cosAngle,
    c: -sinAngle,
    e: 0,
    b: sinAngle,
    d: cosAngle,
    f: 0
  };
  if (isUndefined(cx) || isUndefined(cy)) {
    return rotationMatrix;
  }
  return transform([
    translate(cx, cy),
    rotationMatrix,
    translate(-cx, -cy)
  ]);
}
function rotateDEG(angle, cx = void 0, cy = void 0) {
  return rotate2(angle * PI / 180, cx, cy);
}

// node_modules/transformation-matrix/src/scale.js
function scale(sx, sy = void 0, cx = void 0, cy = void 0) {
  if (isUndefined(sy)) sy = sx;
  const scaleMatrix = {
    a: sx,
    c: 0,
    e: 0,
    b: 0,
    d: sy,
    f: 0
  };
  if (isUndefined(cx) || isUndefined(cy)) {
    return scaleMatrix;
  }
  return transform([
    translate(cx, cy),
    scaleMatrix,
    translate(-cx, -cy)
  ]);
}

// node_modules/transformation-matrix/src/skew.js
var { tan } = Math;

// lib/pcb-dimension/get-pcb-dimension-geometry.ts
var TEXT_OFFSET_MULTIPLIER = 1.5;
var CHARACTER_WIDTH_MULTIPLIER = 0.6;
var TEXT_INTERSECTION_PADDING_MULTIPLIER = 0.3;
function getPcbDimensionGeometry({
  pcbDimension
}) {
  const dimensionDirection = normalizeVector({
    x: pcbDimension.to.x - pcbDimension.from.x,
    y: pcbDimension.to.y - pcbDimension.from.y
  });
  const perpendicularDirection = applyToPoint(rotateDEG(90), dimensionDirection);
  const offsetDirection = normalizeVector(
    pcbDimension.offset_direction ?? { x: 0, y: 0 }
  );
  const offsetDistance = pcbDimension.offset_distance ?? 0;
  const offsetVector = scaleVector(offsetDirection, offsetDistance);
  const dimensionStart = translatePoint(pcbDimension.from, offsetVector);
  const dimensionEnd = translatePoint(pcbDimension.to, offsetVector);
  const arrowSize = pcbDimension.arrow_size ?? 1;
  const dimensionStartArrowBase = translatePoint(
    dimensionStart,
    scaleVector(dimensionDirection, arrowSize)
  );
  const dimensionEndArrowBase = translatePoint(
    dimensionEnd,
    scaleVector(dimensionDirection, -arrowSize)
  );
  const arrowHalfWidthVector = scaleVector(
    perpendicularDirection,
    arrowSize / 2
  );
  const negativeArrowHalfWidthVector = scaleVector(
    perpendicularDirection,
    -arrowSize / 2
  );
  const extensionDirection = hasDirection(offsetDirection) ? offsetDirection : perpendicularDirection;
  const extensionVector = scaleVector(
    extensionDirection,
    offsetDistance + arrowSize
  );
  const dimensionMidpoint = translatePoint(
    midpoint(pcbDimension.from, pcbDimension.to),
    offsetVector
  );
  const fontSize = pcbDimension.font_size ?? 1;
  const textOffsetDistance = arrowSize * TEXT_OFFSET_MULTIPLIER + getRotatedTextClearance({
    fontSize,
    text: pcbDimension.text ?? "",
    textCcwRotationDegrees: pcbDimension.text_ccw_rotation
  });
  return {
    arrowPolygons: [
      [
        dimensionStart,
        translatePoint(dimensionStartArrowBase, arrowHalfWidthVector),
        translatePoint(dimensionStartArrowBase, negativeArrowHalfWidthVector)
      ],
      [
        dimensionEnd,
        translatePoint(dimensionEndArrowBase, arrowHalfWidthVector),
        translatePoint(dimensionEndArrowBase, negativeArrowHalfWidthVector)
      ]
    ],
    dimensionLine: {
      start: dimensionStartArrowBase,
      end: dimensionEndArrowBase,
      width: arrowSize / 5
    },
    extensionLines: [
      {
        start: pcbDimension.from,
        end: translatePoint(pcbDimension.from, extensionVector)
      },
      {
        start: pcbDimension.to,
        end: translatePoint(pcbDimension.to, extensionVector)
      }
    ],
    label: pcbDimension.text ? {
      anchorPosition: translatePoint(
        dimensionMidpoint,
        scaleVector(perpendicularDirection, textOffsetDistance)
      ),
      ccwRotationDegrees: getLabelCcwRotationDegrees({
        dimensionDirection,
        requestedCcwRotationDegrees: pcbDimension.text_ccw_rotation
      }),
      fontSize,
      text: pcbDimension.text
    } : void 0
  };
}
function getLabelCcwRotationDegrees({
  dimensionDirection,
  requestedCcwRotationDegrees
}) {
  let dimensionCcwRotationDegrees = Math.atan2(dimensionDirection.y, dimensionDirection.x) * 180 / Math.PI;
  if (dimensionCcwRotationDegrees > 90 || dimensionCcwRotationDegrees < -90) {
    dimensionCcwRotationDegrees += 180;
  }
  return dimensionCcwRotationDegrees + (requestedCcwRotationDegrees ?? 0);
}
function getRotatedTextClearance({
  fontSize,
  text,
  textCcwRotationDegrees
}) {
  if (textCcwRotationDegrees === void 0 || !Number.isFinite(textCcwRotationDegrees)) {
    return 0;
  }
  const halfWidth = text.length * fontSize * CHARACTER_WIDTH_MULTIPLIER / 2;
  const halfHeight = fontSize / 2;
  const textCcwRotationTransform = rotateDEG(textCcwRotationDegrees);
  const horizontalExtentVector = applyToPoint(textCcwRotationTransform, {
    x: halfWidth,
    y: 0
  });
  const verticalExtentVector = applyToPoint(textCcwRotationTransform, {
    x: 0,
    y: halfHeight
  });
  return Math.abs(horizontalExtentVector.y) + Math.abs(verticalExtentVector.y) + fontSize * TEXT_INTERSECTION_PADDING_MULTIPLIER;
}
function normalizeVector(vector) {
  const vectorLength = Math.hypot(vector.x, vector.y) || 1;
  return applyToPoint(scale(1 / vectorLength), vector);
}
function scaleVector(vector, scaleFactor) {
  return applyToPoint(scale(scaleFactor), vector);
}
function translatePoint(point, translation) {
  return applyToPoint(translate(translation.x, translation.y), point);
}
function hasDirection(direction) {
  return Math.abs(direction.x) > Number.EPSILON || Math.abs(direction.y) > Number.EPSILON;
}

// lib/pcb-dimension/draw-pcb-dimension.ts
function drawPcbDimension({
  mesh,
  pcbDimension,
  textYAxis
}) {
  if (pcbDimension.color) mesh.color = parseColor(pcbDimension.color);
  const { arrowPolygons, dimensionLine, extensionLines, label } = getPcbDimensionGeometry({ pcbDimension });
  for (const arrowPolygon of arrowPolygons) mesh.polygon([arrowPolygon]);
  mesh.line(dimensionLine.start, dimensionLine.end, dimensionLine.width);
  for (const extensionLine of extensionLines) {
    mesh.line(extensionLine.start, extensionLine.end, dimensionLine.width);
  }
  if (!label) return;
  drawText(
    mesh,
    {
      anchor_alignment: "center",
      anchor_position: label.anchorPosition,
      ccw_rotation: label.ccwRotationDegrees,
      font_size: label.fontSize,
      text: label.text,
      type: "pcb_dimension_text"
    },
    textYAxis
  );
}

// lib/compile-circuit.ts
function getElementId(element, index = 0) {
  return element[`${element.type}_id`] ?? `${element.type}:${index}`;
}
function center(e) {
  return e.center ?? e.anchor_position ?? { x: e.x ?? 0, y: e.y ?? 0 };
}
function shape(e, hole = false) {
  if (e.brep_shape)
    return [e.brep_shape.outer_ring, ...e.brep_shape.inner_rings ?? []].map(
      (r) => expandBrepRing(r.vertices)
    );
  if (e.outline?.length) return [e.outline];
  if (e.shape === "rotated_pill_hole_with_rect_pad") {
    const base2 = center(e);
    const c2 = hole ? {
      x: base2.x + (e.hole_offset_x ?? 0),
      y: base2.y + (e.hole_offset_y ?? 0)
    } : base2;
    const width2 = hole ? e.hole_width : e.rect_pad_width;
    const height2 = hole ? e.hole_height : e.rect_pad_height;
    return [
      rectangle(
        c2,
        width2,
        height2,
        hole ? Math.min(width2, height2) / 2 : e.rect_border_radius ?? 0,
        (hole ? e.hole_ccw_rotation : e.rect_ccw_rotation) ?? 0
      )
    ];
  }
  const kind = hole ? e.hole_shape ?? e.shape : e.shape;
  if (kind === "polygon") return [e.points ?? e.vertices ?? []];
  const base = center(e), rotation = e.rect_ccw_rotation ?? e.ccw_rotation ?? e.rotation ?? 0;
  const c = hole ? rotate(
    {
      x: base.x + (e.hole_offset_x ?? 0),
      y: base.y + (e.hole_offset_y ?? 0)
    },
    base,
    rotation
  ) : base;
  if (kind === "circle" || kind === "circular_hole_with_rect_pad" && hole || e.type === "pcb_via") {
    const diameter = hole ? e.hole_diameter : e.outer_diameter ?? (e.radius != null ? e.radius * 2 : e.diameter);
    return [
      ellipse(c, diameter || e.diameter || e.hole_diameter || e.radius * 2)
    ];
  }
  const width = hole ? e.hole_width ?? e.hole_diameter : e.rect_pad_width ?? e.outer_width ?? e.width ?? e.hole_diameter;
  const height = hole ? e.hole_height ?? e.hole_diameter : e.rect_pad_height ?? e.outer_height ?? e.height ?? e.hole_diameter;
  if (kind === "oval") return [ellipse(c, width, height, rotation)];
  if ([
    "rect",
    "square",
    "rotated_rect",
    "roundrect",
    "rounded_rect",
    "pill",
    "rotated_pill",
    "circular_hole_with_rect_pad",
    "pill_hole_with_rect_pad",
    void 0
  ].includes(kind)) {
    const pill = kind?.includes("pill") && !(kind === "pill_hole_with_rect_pad" && !hole);
    const radius = pill ? Math.min(width, height) / 2 : e.corner_radius ?? e.rect_border_radius ?? 0;
    return [rectangle(c, width, height, radius, rotation)];
  }
  throw new Error(`Unsupported shape: ${kind}`);
}
function compileCircuitJson(elements, options = {}) {
  const builders = /* @__PURE__ */ new Map();
  const diagnostics = [], elementIds = elements.map(getElementId);
  const board = elements.find((e) => e.type === "pcb_board");
  const copper = [
    "top",
    ...Array.from(
      { length: Math.max(0, Math.min(8, (board?.num_layers ?? 2) - 2)) },
      (_, i) => `inner${i + 1}`
    ),
    "bottom"
  ];
  const get = (name, index, erase = false, category = 0) => {
    name = normalizeLayer(name);
    if (!builders.has(name))
      builders.set(name, { paint: new MeshBuilder(), erase: new MeshBuilder() });
    const mesh = builders.get(name)[erase ? "erase" : "paint"];
    mesh.color = options.layerColors?.[name] ?? DEFAULT_LAYER_COLORS[name] ?? [0.75, 0.75, 0.75, 1];
    mesh.element = index;
    mesh.category = category;
    return mesh;
  };
  const openings = [];
  const keepouts = [];
  const cutouts = [];
  for (const [index, input] of elements.entries()) {
    const e = input, type = e.type;
    try {
      if (type === "pcb_board" || type === "pcb_panel") {
        const rings = shape(e);
        get("board", index).polygon(rings);
        for (const ring of rings) get("edge_cuts", index).path(ring, 0.1, true);
        for (const side of ["top", "bottom"])
          get(`soldermask_${side}`, index).polygon(rings);
      } else if (type === "pcb_cutout") {
        cutouts.push({ rings: shape(e), index });
        get("edge_cuts", index).path(shape(e)[0], 0.05, true);
      } else if (input.type === "pcb_soldermask_opening") {
        get(`soldermask_${input.layer}`, index, true).polygon(shape(input));
      } else if (type === "pcb_smtpad") {
        get(e.layer, index).polygon(shape(e));
        if (!e.is_covered_with_solder_mask)
          get(`soldermask_${e.layer}`, index, true).polygon(shape(e));
      } else if (type === "pcb_via" || type === "pcb_plated_hole") {
        let layers2 = e.layers ?? copper;
        if (type === "pcb_via" && !e.layers && e.from_layer && e.to_layer) {
          const from = copper.indexOf(e.from_layer), to = copper.indexOf(e.to_layer);
          layers2 = copper.slice(Math.min(from, to), Math.max(from, to) + 1);
        }
        for (const layer of layers2) get(layer, index).polygon(shape(e));
        openings.push({ element: e, index, layers: layers2 });
        for (const side of ["top", "bottom"])
          if (layers2.includes(side) && !e.is_covered_with_solder_mask)
            get(`soldermask_${side}`, index, true).polygon(shape(e));
      } else if (type === "pcb_hole") {
        openings.push({
          element: { ...e, shape: e.hole_shape },
          index,
          layers: copper
        });
      } else if (input.type === "pcb_trace") {
        const route = input.route;
        if (input.route_thickness_mode === "interpolated" && route.some(
          (p, i) => p.route_type === "wire" && !hasWireTaper(p) && route[i + 1]?.route_type === "wire"
        ))
          throw new Error(
            "Interpolated/through-pad traces are not supported yet"
          );
        for (const point of getWireTaperSegments(route)) {
          const polygon = getWireTaperPolygon(point);
          if (!polygon.length)
            throw new Error("Invalid teardrop geometry or interpolation mode");
          get(point.layer, index).polygon([polygon]);
        }
        for (const point of route) {
          if (point.route_type !== "through_pad") continue;
          for (const layer of /* @__PURE__ */ new Set([point.start_layer, point.end_layer]))
            get(layer, index).line(point.start, point.end, point.width);
        }
        for (let i = 1; i < route.length; i++) {
          let a = route[i - 1], b = route[i];
          if (hasWireTaper(a)) continue;
          if (a.route_type === "through_pad")
            a = {
              route_type: "wire",
              ...a.end,
              layer: a.end_layer,
              width: a.width
            };
          if (b.route_type === "through_pad")
            b = {
              route_type: "wire",
              ...b.start,
              layer: b.start_layer,
              width: b.width
            };
          if (a.route_type === "wire" && b.route_type === "wire" && a.layer === b.layer)
            get(a.layer, index).line(a, b, a.width);
          else if (a.route_type === "wire" && b.route_type === "via" && [b.from_layer, b.to_layer].includes(a.layer))
            get(a.layer, index).line(a, b, a.width);
          else if (a.route_type === "via" && b.route_type === "wire" && [a.from_layer, a.to_layer].includes(b.layer))
            get(b.layer, index).line(a, b, b.width);
        }
      } else if (type === "pcb_copper_pour") {
        get(e.layer, index, false, 1).polygon(shape(e));
      } else if (type === "pcb_copper_text") {
        drawText(get(e.layer, index), e, options.textYAxis);
      } else if (/^pcb_(silkscreen|fabrication_note|courtyard|note|user_note)_/.test(
        type
      )) {
        const group = type.match(
          /^pcb_(silkscreen|fabrication_note|courtyard|note|user_note)_/
        )[1];
        const suffix = {
          silkscreen: "silkscreen",
          fabrication_note: "fabrication",
          courtyard: "courtyard",
          note: "notes",
          user_note: "notes"
        }[group];
        const layer = `${e.layer ?? "top"}_${suffix}`;
        const mesh = get(layer, index);
        if (input.type === "pcb_note_dimension" || input.type === "pcb_fabrication_note_dimension") {
          drawPcbDimension({
            mesh,
            pcbDimension: input,
            textYAxis: options.textYAxis
          });
        } else if (type.endsWith("_text")) {
          if (e.color && (group === "note" || group === "fabrication_note"))
            mesh.color = parseColor(e.color);
          drawText(mesh, e, options.textYAxis, options.pcbNoteFont);
        } else if (type.endsWith("_path") || type.endsWith("_line") || type.endsWith("_outline")) {
          const points = e.route ?? e.points ?? e.outline ?? [e.start, e.end].filter(Boolean);
          const isFabricationPath = type === "pcb_fabrication_note_path";
          if (isFabricationPath && e.color) mesh.color = parseColor(e.color);
          if (isFabricationPath) {
            mesh.fabricationPath(
              points,
              e.has_stroke === false ? 0 : e.stroke_width ?? 0.05,
              !!e.is_filled
            );
          } else {
            mesh.path(
              points,
              e.stroke_width ?? e.width ?? 0.05,
              type.endsWith("_outline")
            );
          }
        } else if (type === "pcb_silkscreen_graphic" && e.shape === "brep") {
          mesh.polygon(shape(e));
        } else if (type.endsWith("_rect")) {
          const points = rectangle(
            center(e),
            e.width,
            e.height,
            e.corner_radius ?? 0,
            e.ccw_rotation ?? 0
          );
          if (e.is_filled) mesh.polygon([points]);
          else mesh.path(points, e.stroke_width ?? 0.05, true);
        } else if (type.endsWith("_circle")) {
          const points = ellipse(center(e), (e.radius ?? 0) * 2);
          if (e.is_filled) mesh.polygon([points]);
          else mesh.path(points, e.stroke_width ?? 0.05, true);
        } else throw new Error("Unsupported annotation geometry");
      } else if (type === "pcb_keepout") {
        keepouts.push({
          rings: shape(e),
          index,
          layers: e.layers ?? [e.layer ?? "top"]
        });
      } else if (type.startsWith("pcb_") && ![
        "pcb_component",
        "pcb_port",
        "pcb_group",
        "pcb_solder_paste",
        "pcb_debug_object",
        "pcb_trace_hint",
        "pcb_anchor",
        "pcb_breakout_point"
        // Routing target metadata, not visible geometry.
      ].includes(type) && !/_(error|warning)$/.test(type)) {
        throw new Error("Unsupported PCB element");
      }
    } catch (error) {
      diagnostics.push({
        elementId: elementIds[index],
        type,
        message: String(error)
      });
    }
  }
  for (const { rings, index, layers: layers2 } of keepouts) {
    try {
      for (const layer of layers2) drawKeepout(get(layer, index), rings);
    } catch (error) {
      diagnostics.push({
        elementId: elementIds[index],
        type: "pcb_keepout",
        message: String(error)
      });
    }
  }
  for (const { element, index, layers: layers2 } of openings) {
    const rings = shape(element, true);
    for (const layer of layers2) get(layer, index, true).polygon(rings);
    const isThrough = layers2.includes("top") && layers2.includes("bottom");
    if (isThrough) {
      get("board", index, true).polygon(rings);
      get("drill", index).polygon(rings);
    }
    for (const side of ["top", "bottom"])
      if (layers2.includes(side))
        get(`soldermask_${side}`, index, true).polygon(rings);
  }
  for (const { rings, index } of cutouts) {
    get("drill", index).polygon(rings);
    for (const name of builders.keys())
      if (name !== "edge_cuts" && name !== "drill")
        get(name, index, true).polygon(rings);
  }
  const layers = [...builders].map(([name, mesh]) => ({
    name,
    paint: mesh.paint.build(),
    erase: mesh.erase.build()
  }));
  return {
    layers,
    elementIds,
    diagnostics,
    triangleCount: layers.reduce(
      (sum, l) => sum + (l.paint.indices.length + l.erase.indices.length) / 3,
      0
    )
  };
}

// lib/shaders.ts
var geometryShader = (
  /* wgsl */
  `
struct Camera { rowX: vec4f, rowY: vec4f, viewport: vec4f }
@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> highlights: array<u32>;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) @interpolate(flat) category: u32,
  @location(2) @interpolate(flat) selected: u32,
}
@vertex fn vertexMain(@location(0) p: vec2f, @location(1) color: vec4f,
  @location(2) element: f32, @location(3) category: f32) -> VertexOut {
  let pixel = vec2f(dot(camera.rowX.xyz, vec3f(p, 1)), dot(camera.rowY.xyz, vec3f(p, 1)));
  var out: VertexOut;
  out.position = vec4f(pixel.x / camera.viewport.x * 2 - 1, 1 - pixel.y / camera.viewport.y * 2, 0, 1);
  let highlight = select(0.0, 1.0, (highlights[u32(element)] & 1u) != 0u);
  out.color = vec4f(mix(color.rgb, min(vec3f(1), color.rgb * 1.5), highlight), color.a);
  out.category = u32(category);
  out.selected = highlights[u32(element)] & 2u;
  return out;
}
@fragment fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
  if (in.category == 1u && camera.viewport.z == 0) { discard; }
  if (camera.viewport.w == 1) {
    if (in.selected == 0u) { discard; }
    return vec4f(in.color.rgb, 1);
  }
  let alpha = in.color.a * select(1.0, camera.viewport.z, in.category == 1u);
  return vec4f(in.color.rgb * alpha, alpha);
}
`
);
var compositeShader = (
  /* wgsl */
  `
@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;
@group(0) @binding(2) var<uniform> fade: vec4f;
struct Out { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> Out {
  let points = array<vec2f, 6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  var out: Out;
  out.uv = points[index];
  out.position = vec4f(out.uv.x * 2 - 1, 1 - out.uv.y * 2, 0, 1);
  return out;
}
@fragment fn fragmentMain(in: Out) -> @location(0) vec4f {
  return textureSample(image, imageSampler, in.uv) * fade.x;
}
`
);

// lib/CircuitToWebGpuDrawer.ts
var over = {
  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
};
var CircuitToWebGpuDrawer = class _CircuitToWebGpuDrawer {
  constructor(canvas, device, context, format, config) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    this.config = config;
    this.uniform = device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.xRayUniform = device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.highlights = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const module = device.createShaderModule({ code: geometryShader });
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [
        device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
              buffer: { type: "uniform" }
            },
            {
              binding: 1,
              visibility: GPUShaderStage.VERTEX,
              buffer: { type: "read-only-storage" }
            }
          ]
        })
      ]
    });
    const geometry = (blend) => ({
      layout,
      vertex: {
        module,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: 32,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              { shaderLocation: 1, offset: 8, format: "float32x4" },
              { shaderLocation: 2, offset: 24, format: "float32" },
              { shaderLocation: 3, offset: 28, format: "float32" }
            ]
          }
        ]
      },
      fragment: {
        module,
        entryPoint: "fragmentMain",
        targets: [{ format: "rgba8unorm", blend }]
      },
      primitive: { topology: "triangle-list" },
      multisample: { count: config.sampleCount ?? 4 }
    });
    this.paintPipeline = device.createRenderPipeline(geometry(over));
    this.erasePipeline = device.createRenderPipeline(
      geometry({
        color: { srcFactor: "zero", dstFactor: "one-minus-src-alpha" },
        alpha: { srcFactor: "zero", dstFactor: "one-minus-src-alpha" }
      })
    );
    const composite = device.createShaderModule({ code: compositeShader });
    this.compositePipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: composite, entryPoint: "vertexMain" },
      fragment: {
        module: composite,
        entryPoint: "fragmentMain",
        targets: [{ format, blend: over }]
      },
      primitive: { topology: "triangle-list" }
    });
    this.sampler = device.createSampler({
      minFilter: "linear",
      magFilter: "linear"
    });
    device.lost.then((info) => {
      this.lost = true;
      if (!this.disposed) config.onDeviceLost?.(info.message || info.reason);
    });
  }
  canvas;
  device;
  context;
  config;
  /** Feature detection for clients that also support older renderer versions. */
  static supportsXRayNet = true;
  realToCanvasMat = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 };
  stats = {
    geometryUploads: 0,
    frames: 0,
    triangleCount: 0,
    compileMs: 0,
    vertexBytes: 0
  };
  circuit;
  scene;
  layers = [];
  xRayLayers = [];
  xRayUniform;
  xRayCameraGroup;
  uniform;
  highlights;
  cameraGroup;
  highlightKey = "";
  highlightIndices = /* @__PURE__ */ new Map();
  sample;
  size = "";
  disposed = false;
  adapterInfo;
  lost = false;
  paintPipeline;
  erasePipeline;
  compositePipeline;
  sampler;
  options = {};
  static async create(canvas, options = {}) {
    if (!globalThis.navigator?.gpu) throw new Error("WebGPU is unavailable");
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance"
    });
    if (!adapter) throw new Error("No WebGPU adapter available");
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) {
      device.destroy();
      throw new Error("WebGPU canvas context is unavailable");
    }
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });
    device.pushErrorScope("validation");
    try {
      const drawer = new _CircuitToWebGpuDrawer(
        canvas,
        device,
        context,
        format,
        options
      );
      const error = await device.popErrorScope();
      if (error) {
        drawer.dispose();
        throw new Error(error.message);
      }
      device.addEventListener(
        "uncapturederror",
        (event) => options.onDeviceLost?.(event.error.message)
      );
      drawer.adapterInfo = adapter.info;
      return drawer;
    } catch (error) {
      context.unconfigure();
      device.destroy();
      throw error;
    }
  }
  get diagnostics() {
    return this.scene?.diagnostics ?? [];
  }
  setCircuitJson(circuitJson) {
    this.assertLive();
    if (this.circuit === circuitJson) return;
    const start = performance.now(), scene = compileCircuitJson(circuitJson, this.config);
    this.releaseLayers();
    this.highlights.destroy();
    this.highlights = this.device.createBuffer({
      size: Math.max(4, scene.elementIds.length * 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.highlightIndices = new Map(
      scene.elementIds.map((id, index) => [id, index])
    );
    this.highlightKey = "!";
    this.cameraGroup = this.device.createBindGroup({
      layout: this.paintPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: this.highlights } }
      ]
    });
    this.xRayCameraGroup = this.device.createBindGroup({
      layout: this.paintPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.xRayUniform } },
        { binding: 1, resource: { buffer: this.highlights } }
      ]
    });
    this.stats.vertexBytes = 0;
    const upload = (mesh) => {
      const make = (data, usage) => {
        const buffer = this.device.createBuffer({
          size: Math.max(4, data.byteLength),
          usage: usage | GPUBufferUsage.COPY_DST
        });
        if (data.byteLength)
          this.device.queue.writeBuffer(
            buffer,
            0,
            data.buffer,
            data.byteOffset,
            data.byteLength
          );
        this.stats.vertexBytes += data.byteLength;
        return buffer;
      };
      return {
        vertices: make(mesh.vertices, GPUBufferUsage.VERTEX),
        indices: make(mesh.indices, GPUBufferUsage.INDEX),
        count: mesh.indices.length
      };
    };
    this.layers = scene.layers.map((layer) => ({
      name: layer.name,
      paint: upload(layer.paint),
      erase: upload(layer.erase),
      opacity: this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      })
    }));
    this.xRayLayers = this.layers.filter((layer) => this.isCopper(layer.name) || layer.name === "drill").map((layer) => ({
      ...layer,
      opacity: this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      })
    }));
    this.scene = scene;
    this.circuit = circuitJson;
    this.size = "";
    this.stats.geometryUploads++;
    this.stats.triangleCount = scene.triangleCount;
    this.stats.compileMs = performance.now() - start;
  }
  /** Similar to circuit-to-canvas; repeated draws with the same array reuse all buffers. */
  drawElements(elements, options = {}) {
    this.setCircuitJson(elements);
    this.options = {};
    this.render(options);
  }
  render(options = {}) {
    this.assertLive();
    this.options = { ...this.options, ...options };
    const o = this.options;
    if (o.transform) this.realToCanvasMat = o.transform;
    const t = this.realToCanvasMat, width = this.canvas.width, height = this.canvas.height;
    if (!width || !height) return;
    if (![...Object.values(t), width, height].every(Number.isFinite))
      throw new Error("Invalid camera or canvas dimensions");
    if (width > this.device.limits.maxTextureDimension2D || height > this.device.limits.maxTextureDimension2D)
      throw new Error("Canvas exceeds GPU texture limits");
    const copperPourOpacity = o.showCopperPours === false ? 0 : Number.isFinite(o.copperPourOpacity) ? Math.max(0, Math.min(1, o.copperPourOpacity)) : 1;
    this.resize(width, height);
    this.device.queue.writeBuffer(
      this.uniform,
      0,
      new Float32Array([
        t.a,
        t.c,
        t.e,
        0,
        t.b,
        t.d,
        t.f,
        0,
        width,
        height,
        copperPourOpacity,
        0
      ])
    );
    const xRayIds = o.xRayElementIds ?? [];
    const xRayActive = xRayIds.length > 0;
    if (xRayActive)
      this.device.queue.writeBuffer(
        this.xRayUniform,
        0,
        new Float32Array([
          t.a,
          t.c,
          t.e,
          0,
          t.b,
          t.d,
          t.f,
          0,
          width,
          height,
          copperPourOpacity,
          1
        ])
      );
    const ids = xRayActive ? [] : o.highlightedElementIds ?? [], key = JSON.stringify([ids, xRayIds]);
    if (key !== this.highlightKey) {
      const mask = new Uint32Array(
        Math.max(1, this.scene?.elementIds.length ?? 0)
      );
      for (const id of ids) {
        const i = this.highlightIndices.get(id);
        if (i !== void 0) mask[i] = 1;
      }
      for (const id of xRayIds) {
        const i = this.highlightIndices.get(id);
        if (i !== void 0) mask[i] |= 2;
      }
      this.device.queue.writeBuffer(this.highlights, 0, mask);
      this.highlightKey = key;
    }
    const selected = normalizeLayer(o.selectedLayer ?? "top"), filter = o.layers ? new Set(o.layers.map(normalizeLayer)) : void 0;
    const visible = this.layers.filter((l) => {
      if (filter && !filter.has(l.name)) return false;
      if (xRayActive && !this.isCopper(l.name)) return false;
      if (l.name === "board" && !o.showBoardMaterial) return false;
      if (l.name.startsWith("soldermask_") && (!o.showSolderMask || l.name !== `soldermask_${selected}`))
        return false;
      if (l.name.includes("silkscreen") && o.showSilkscreen === false)
        return false;
      if (l.name.includes("fabrication") && !o.showFabricationNotes)
        return false;
      if (l.name.includes("notes") && o.showPcbNotes === false) return false;
      if (l.name.includes("courtyard") && !o.showCourtyards) return false;
      return xRayActive && this.isCopper(l.name) || this.opacity(l.name, selected, o.hiddenLayerOpacity ?? 0.4) > 0;
    }).sort(
      (a, b) => this.order(a.name, selected) - this.order(b.name, selected)
    );
    const selectedLayers = xRayActive ? this.xRayLayers.filter((layer) => !filter || filter.has(layer.name)).sort(
      (a, b) => this.xRayOrder(a.name, selected) - this.xRayOrder(b.name, selected)
    ) : [];
    const renderLayers = [
      ...visible.map((layer) => ({ layer, xRay: false })),
      ...selectedLayers.map((layer) => ({ layer, xRay: true }))
    ];
    const encoder = this.device.createCommandEncoder();
    for (const { layer, xRay } of renderLayers) {
      this.ensureTexture(layer, width, height);
      const target = layer.texture.createView(), msaa = (this.config.sampleCount ?? 4) > 1;
      const pass2 = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: msaa ? this.sample.createView() : target,
            ...msaa ? { resolveTarget: target } : {},
            clearValue: [0, 0, 0, 0],
            loadOp: "clear",
            storeOp: msaa ? "discard" : "store"
          }
        ]
      });
      for (const [mesh, pipeline] of [
        [layer.paint, this.paintPipeline],
        [layer.erase, this.erasePipeline]
      ]) {
        if (!mesh.count) continue;
        pass2.setBindGroup(
          0,
          xRay && pipeline === this.paintPipeline ? this.xRayCameraGroup : this.cameraGroup
        );
        pass2.setPipeline(pipeline);
        pass2.setVertexBuffer(0, mesh.vertices);
        pass2.setIndexBuffer(mesh.indices, "uint32");
        pass2.drawIndexed(mesh.count);
      }
      pass2.end();
      this.device.queue.writeBuffer(
        layer.opacity,
        0,
        new Float32Array([
          xRay ? 1 : xRayActive && this.isCopper(layer.name) ? Math.max(0, Math.min(1, o.hiddenLayerOpacity ?? 0.4)) : this.opacity(layer.name, selected, o.hiddenLayerOpacity ?? 0.4),
          0,
          0,
          0
        ])
      );
    }
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: o.background ?? [0, 0, 0, 0],
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    pass.setPipeline(this.compositePipeline);
    for (const { layer } of renderLayers) {
      pass.setBindGroup(0, layer.composite);
      pass.draw(6);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    this.stats.frames++;
  }
  async flush() {
    this.assertLive();
    await this.device.queue.onSubmittedWorkDone();
  }
  isCopper(layer) {
    return /^(top|bottom|inner\d+)$/.test(layer);
  }
  opacity(layer, selected, hidden) {
    return ["board", "drill", "edge_cuts"].includes(layer) || layer === selected || layer.startsWith(`${selected}_`) || layer.endsWith(`_${selected}`) ? 1 : Math.max(0, Math.min(1, hidden));
  }
  xRayOrder(layer, selected) {
    if (layer === "drill") return 200;
    if (layer === selected) return 100;
    if (layer === "bottom") return 0;
    if (layer.startsWith("inner")) return 20 - Number(layer.slice(5));
    return 40;
  }
  order(layer, selected) {
    if (layer === "board") return -100;
    if (layer === "drill") return 200;
    if (layer === "edge_cuts") return 150;
    const base = layer === selected ? 100 : layer.startsWith("inner") ? 20 - Number(layer.slice(5)) : layer === "bottom" ? 30 : 40;
    if (layer.includes("soldermask")) return 110;
    if (layer.startsWith(`${selected}_`)) return 120;
    return base;
  }
  resize(width, height) {
    const size = `${width}:${height}`;
    if (size === this.size) return;
    this.sample?.destroy();
    this.sample = (this.config.sampleCount ?? 4) > 1 ? this.device.createTexture({
      size: [width, height],
      format: "rgba8unorm",
      sampleCount: this.config.sampleCount ?? 4,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    }) : void 0;
    for (const layer of [...this.layers, ...this.xRayLayers]) {
      layer.texture?.destroy();
      layer.texture = void 0;
      layer.composite = void 0;
    }
    this.size = size;
  }
  ensureTexture(layer, width, height) {
    if (layer.texture) return;
    layer.texture = this.device.createTexture({
      size: [width, height],
      format: "rgba8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    layer.composite = this.device.createBindGroup({
      layout: this.compositePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: layer.texture.createView() },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer: layer.opacity } }
      ]
    });
  }
  assertLive() {
    if (this.disposed || this.lost)
      throw new Error(this.lost ? "WebGPU device lost" : "Renderer disposed");
  }
  releaseLayers() {
    for (const layer of this.xRayLayers) {
      layer.opacity.destroy();
      layer.texture?.destroy();
    }
    this.xRayLayers = [];
    for (const layer of this.layers) {
      for (const mesh of [layer.paint, layer.erase]) {
        mesh.vertices.destroy();
        mesh.indices.destroy();
      }
      layer.opacity.destroy();
      layer.texture?.destroy();
    }
    this.layers = [];
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseLayers();
    this.sample?.destroy();
    this.uniform.destroy();
    this.xRayUniform.destroy();
    this.highlights.destroy();
    this.context.unconfigure();
    const destroyDevice = () => this.device.destroy();
    void this.device.queue.onSubmittedWorkDone().then(destroyDevice, destroyDevice);
    this.circuit = void 0;
    this.scene = void 0;
  }
};
export {
  CircuitToWebGpuDrawer,
  DEFAULT_LAYER_COLORS,
  compileCircuitJson,
  getElementId,
  normalizeLayer
};
