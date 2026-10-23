export const interpolatedTrace = {
  type: "pcb_trace" as const,
  pcb_trace_id: "interpolated",
  route_thickness_mode: "interpolated" as const,
  route: [
    {
      route_type: "wire" as const,
      x: 0,
      y: 0,
      width: 1,
      layer: "top" as const,
    },
    {
      route_type: "wire" as const,
      x: 4,
      y: 0,
      width: 3,
      layer: "top" as const,
    },
  ],
}
