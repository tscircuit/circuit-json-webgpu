import type { Diagnostic } from "../../lib/types"

export function getResolvedColorElementIds(
  baseDiagnostics: Diagnostic[] = [],
  currentDiagnostics: Diagnostic[] = [],
): string[] {
  const currentIds = new Set(currentDiagnostics.map((d) => d.elementId))
  return [
    ...new Set(
      baseDiagnostics
        .filter(
          (d) =>
            d.message.startsWith("Error: Unsupported color: ") &&
            !currentIds.has(d.elementId),
        )
        .map((d) => d.elementId),
    ),
  ].sort()
}
