const VERTICES_PER_QUAD = 6
const STROKE_QUADS = 3
export const PHASE_SKEW_STROKE_VERTEX_COUNT = VERTICES_PER_QUAD * STROKE_QUADS

const MIN_DIRECTION_LENGTH = 1e-6
const COVERAGE_INTEGRATION_STEPS = 8

/** Draw a gradient stroke with optional round caps. */
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
  @location(4) roundCaps: vec2f,
  @location(5) highlightIndex: f32,
  @location(6) bodyColorEndpoint: f32,
}
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) strokePixels: vec2f,
  @location(1) @interpolate(flat) lengthPixels: f32,
  @location(2) @interpolate(flat) radiusPixels: f32,
  @location(3) color: vec4f,
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
  let quad = in.vertex / VERTICES_PER_QUAD;
  let boundary = quad + u32(corner.x);
  let startPixels = boardToCanvas(in.boardEndpointsMm.xy);
  let deltaPixels = boardToCanvas(in.boardEndpointsMm.zw) - startPixels;
  let lengthPixels = length(deltaPixels);
  let tangent = direction(deltaPixels);
  let normal = vec2f(-tangent.y, tangent.x);
  // A transform scales the width by its area scale divided by its tangent scale.
  let boardToCanvasLinear = mat2x2f(camera.rowX.x, camera.rowY.x, camera.rowX.y, camera.rowY.y);
  let boardTangent = direction(in.boardEndpointsMm.zw - in.boardEndpointsMm.xy);
  let pixelsPerMmAcrossStroke = abs(determinant(boardToCanvasLinear)) /
    max(length(boardToCanvasLinear * boardTangent), MIN_DIRECTION_LENGTH);
  let radiusPixels = in.widthMm * pixelsPerMmAcrossStroke * 0.5;
  let marginPixels = radiusPixels + 1.0;
  let boundaries = array<f32, 4>(
    -marginPixels * in.roundCaps.x, 0.0,
    lengthPixels, lengthPixels + marginPixels * in.roundCaps.y
  );
  let strokePixels = vec2f(boundaries[boundary], corner.y * marginPixels);
  let pixel = startPixels + tangent * strokePixels.x + normal * strokePixels.y;
  let ndc = pixel / camera.viewport.xy * vec2f(2, -2) + vec2f(-1, 1);
  // At a zero limit, only the endpoint itself and its cap can be neutral.
  let solidBody = quad == 1u && in.bodyColorEndpoint != 0.0;
  let useEndColor = select(boundary >= 2u, in.bodyColorEndpoint > 0.0, solidBody);
  let color = select(in.startColor, in.endColor, useEndColor);
  // Use the existing hover mask so pointer moves can reuse the stroke buffers.
  let highlighted = in.highlightIndex >= 0 && (highlights[u32(in.highlightIndex)] & 1u) != 0u;
  return VertexOut(
    vec4f(select(ndc, vec2f(2), highlighted), 0, 1),
    strokePixels, lengthPixels, radiusPixels, color
  );
}

fn boxOverlap(centerPixels: f32, halfWidthPixels: f32) -> f32 {
  return clamp(min(centerPixels + 0.5, halfWidthPixels) - max(centerPixels - 0.5, -halfWidthPixels), 0, 1);
}

@fragment fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
  // Integrate the overlap of a pixel-wide box with the capsule's cross-section.
  var coverage = 0.0;
  for (var step = 0; step < COVERAGE_INTEGRATION_STEPS; step++) {
    let alongPixels = in.strokePixels.x - 0.5 + (f32(step) + 0.5) / f32(COVERAGE_INTEGRATION_STEPS);
    let beyondEndPixels = max(max(-alongPixels, alongPixels - in.lengthPixels), 0);
    let halfWidthPixels = sqrt(max(in.radiusPixels * in.radiusPixels - beyondEndPixels * beyondEndPixels, 0));
    coverage += boxOverlap(in.strokePixels.y, halfWidthPixels);
  }
  let alpha = in.color.a * coverage / f32(COVERAGE_INTEGRATION_STEPS);
  return vec4f(in.color.rgb * alpha, alpha);
}
`
