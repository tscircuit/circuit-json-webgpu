const VERTICES_PER_QUAD = 6
const STROKE_QUADS = 3
export const PHASE_SKEW_STROKE_VERTEX_COUNT = VERTICES_PER_QUAD * STROKE_QUADS

const MIN_DIRECTION_LENGTH = 1e-6
const COVERAGE_INTEGRATION_STEPS = 8

/** Draw a gradient between shared cross-sections and round the run ends. */
export const phaseSkewStrokeShader = /* wgsl */ `
struct Camera { rowX: vec4f, rowY: vec4f, viewport: vec4f }
@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> highlights: array<u32>;

struct VertexIn {
  @builtin(vertex_index) vertex: u32,
  @location(0) boardEndpointsMm: vec4f,
  @location(1) startColor: vec4f,
  @location(2) endColor: vec4f,
  @location(3) widthMm: f32,
  @location(4) boardJoinOffsets: vec4f,
  @location(5) highlightIndex: f32,
}
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) strokePixels: vec2f,
  @location(1) @interpolate(flat) lengthPixels: f32,
  @location(2) radiusPixels: f32,
  @location(3) rampDistances: vec2f,
  @location(4) @interpolate(flat) startColor: vec4f,
  @location(5) @interpolate(flat) endColor: vec4f,
  @location(6) @interpolate(flat) caps: vec2f,
}

const VERTICES_PER_QUAD = ${VERTICES_PER_QUAD}u;
const MIN_DIRECTION_LENGTH = ${MIN_DIRECTION_LENGTH};
const COVERAGE_INTEGRATION_STEPS = ${COVERAGE_INTEGRATION_STEPS};

fn boardToCanvas(point: vec2f) -> vec2f {
  return vec2f(
    dot(camera.rowX.xyz, vec3f(point, 1)),
    dot(camera.rowY.xyz, vec3f(point, 1))
  );
}

fn direction(delta: vec2f) -> vec2f {
  let distance = length(delta);
  return select(vec2f(1, 0), delta / max(distance, MIN_DIRECTION_LENGTH), distance > MIN_DIRECTION_LENGTH);
}

@vertex fn vertexMain(in: VertexIn) -> VertexOut {
  let corners = array<vec2f, VERTICES_PER_QUAD>(
    vec2f(0, -1), vec2f(1, -1), vec2f(0, 1),
    vec2f(0, 1), vec2f(1, -1), vec2f(1, 1)
  );
  let corner = corners[in.vertex % VERTICES_PER_QUAD];
  let boundary = in.vertex / VERTICES_PER_QUAD + u32(corner.x);
  let startPixels = boardToCanvas(in.boardEndpointsMm.xy);
  let endPixels = boardToCanvas(in.boardEndpointsMm.zw);
  let deltaPixels = endPixels - startPixels;
  let lengthPixels = length(deltaPixels);
  let tangent = direction(deltaPixels);
  let normal = vec2f(-tangent.y, tangent.x);
  // A transform scales the width by its area scale divided by its tangent scale.
  let boardToCanvasLinear = mat2x2f(camera.rowX.x, camera.rowY.x, camera.rowX.y, camera.rowY.y);
  let boardTangent = direction(in.boardEndpointsMm.zw - in.boardEndpointsMm.xy);
  let areaScale = determinant(boardToCanvasLinear);
  let pixelsPerMmAcrossStroke = abs(areaScale) /
    max(length(boardToCanvasLinear * boardTangent), MIN_DIRECTION_LENGTH);
  let radiusPixels = in.widthMm * pixelsPerMmAcrossStroke * 0.5;
  // Leave one pixel beyond the stroke for coverage antialiasing.
  let marginPixels = radiusPixels + 1.0;
  let boardMarginMm = marginPixels / max(pixelsPerMmAcrossStroke, MIN_DIRECTION_LENGTH);
  let signedMarginMm = select(-boardMarginMm, boardMarginMm, areaScale >= 0.0);
  let startCap = all(in.boardJoinOffsets.xy == vec2f(0));
  let endCap = all(in.boardJoinOffsets.zw == vec2f(0));
  let startOffset = select(boardToCanvasLinear * in.boardJoinOffsets.xy * signedMarginMm, normal * marginPixels, startCap);
  let endOffset = select(boardToCanvasLinear * in.boardJoinOffsets.zw * signedMarginMm, normal * marginPixels, endCap);
  let atEnd = boundary >= 2u;
  let offset = select(startOffset, endOffset, atEnd);
  let startExtension = select(0.0, marginPixels, startCap && boundary == 0u);
  let endExtension = select(0.0, marginPixels, endCap && boundary == 3u);
  let displacement = corner.y * offset + tangent * (endExtension - startExtension);
  let pixel = select(startPixels, endPixels, atEnd) + displacement;
  let strokePixels = vec2f(
    select(0.0, lengthPixels, atEnd) + dot(displacement, tangent),
    dot(displacement, normal)
  );
  let startSlope = dot(startOffset, tangent) / max(dot(startOffset, normal), MIN_DIRECTION_LENGTH);
  let endSlope = dot(endOffset, tangent) / max(dot(endOffset, normal), MIN_DIRECTION_LENGTH);
  // Measure the ramp from the cuts so its color is constant across each joint.
  let rampDistances = vec2f(
    strokePixels.x - startSlope * strokePixels.y,
    lengthPixels - strokePixels.x + endSlope * strokePixels.y
  );
  let ndc = pixel / camera.viewport.xy * vec2f(2, -2) + vec2f(-1, 1);
  // Use the existing hover mask so pointer moves can reuse the stroke buffers.
  let highlighted = in.highlightIndex >= 0 && (highlights[u32(in.highlightIndex)] & 1u) != 0u;
  return VertexOut(
    vec4f(select(ndc, vec2f(2), highlighted), 0, 1),
    strokePixels,
    lengthPixels,
    dot(offset, normal) * radiusPixels / marginPixels,
    rampDistances,
    in.startColor,
    in.endColor,
    vec2f(select(0.0, 1.0, startCap), select(0.0, 1.0, endCap))
  );
}

fn boxOverlap(centerPixels: f32, halfWidthPixels: f32) -> f32 {
  return clamp(min(centerPixels + 0.5, halfWidthPixels) - max(centerPixels - 0.5, -halfWidthPixels), 0, 1);
}

@fragment fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
  // Integrate the overlap of a pixel-wide box with the stroke's cross-section.
  var coverage = 0.0;
  for (var step = 0; step < COVERAGE_INTEGRATION_STEPS; step++) {
    let alongPixels = in.strokePixels.x - 0.5 + (f32(step) + 0.5) / f32(COVERAGE_INTEGRATION_STEPS);
    let beyondEndPixels = max(max(-alongPixels * in.caps.x, (alongPixels - in.lengthPixels) * in.caps.y), 0);
    let halfWidthPixels = sqrt(max(in.radiusPixels * in.radiusPixels - beyondEndPixels * beyondEndPixels, 0));
    coverage += boxOverlap(in.strokePixels.y, halfWidthPixels);
  }
  let rampLength = in.rampDistances.x + in.rampDistances.y;
  let fraction = clamp(in.rampDistances.x / max(rampLength, MIN_DIRECTION_LENGTH), 0, 1);
  let color = mix(in.startColor, in.endColor, fraction);
  let alpha = color.a * coverage / f32(COVERAGE_INTEGRATION_STEPS);
  return vec4f(color.rgb * alpha, alpha);
}
`
