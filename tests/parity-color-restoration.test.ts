import { expect, test } from "bun:test"
import {
  findParityRegressions,
  type ParityReport,
} from "./parity/check-regressions"

test("restored color annotations require snapshots and unchanged existing geometry", () => {
  const base: ParityReport = {
    upstreamCommit: "same-reference",
    snapshots: [{ pass: true }],
    snapshotFailed: 0,
    capturedRenderCalls: 1,
    renderCalls: 1,
    parityFailed: 1,
    referenceFailed: 0,
    results: [
      {
        id: "base-case",
        path: "note.test.ts",
        test: "white note",
        status: "mismatch",
        changedPixels: 10,
        diagnostics: [
          {
            elementId: "note",
            type: "pcb_note_text",
            message: "Error: Unsupported color: white",
          },
        ],
      },
    ],
    referenceTests: [
      {
        path: "note.test.ts",
        name: "white note",
        status: "passed",
        caseIds: ["base-case"],
      },
    ],
  }
  const head = structuredClone(base)
  head.results[0].id = "head-case"
  head.results[0].diagnostics = []
  head.results[0].changedPixels = 20
  expect(findParityRegressions(base, head)).toHaveLength(1)

  head.results[0].existingGeometryComparison = {
    excludedElementIds: ["note"],
    changedPixels: 10,
    diagnostics: [],
  }
  expect(findParityRegressions(base, head)).toEqual([])
  expect(head.results[0].changedPixels).toBe(20)
  expect(head.results[0].status).toBe("mismatch")

  for (const existing of [
    { excludedElementIds: ["note"], changedPixels: 11, diagnostics: [] },
    { excludedElementIds: ["unrelated"], changedPixels: 10, diagnostics: [] },
    { excludedElementIds: ["note"], changedPixels: NaN, diagnostics: [] },
    { excludedElementIds: ["note"], changedPixels: -1, diagnostics: [] },
    {
      excludedElementIds: ["note"],
      changedPixels: 10,
      diagnostics: [
        { elementId: "pad", type: "pcb_smtpad", message: "Unsupported shape" },
      ],
    },
  ]) {
    const invalid = structuredClone(head)
    invalid.results[0].existingGeometryComparison = existing
    expect(findParityRegressions(base, invalid)).toHaveLength(1)
  }

  const badSnapshot = structuredClone(head)
  badSnapshot.snapshots[0].pass = false
  badSnapshot.snapshotFailed = 1
  expect(findParityRegressions(base, badSnapshot)).toHaveLength(1)

  const newDiagnostic = structuredClone(head)
  newDiagnostic.results[0].diagnostics = [
    { elementId: "pad", type: "pcb_smtpad", message: "Unsupported shape" },
  ]
  expect(findParityRegressions(base, newDiagnostic)).toHaveLength(1)

  const unrelatedError = structuredClone(base)
  unrelatedError.results[0].diagnostics![0].message = "Unsupported geometry"
  expect(findParityRegressions(unrelatedError, head)).toHaveLength(1)
})
