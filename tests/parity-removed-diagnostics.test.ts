import { expect, test } from "bun:test"
import {
  type ParityReport,
  findParityRegressions,
} from "./parity/check-regressions"

function createParityReport(): ParityReport {
  return {
    upstreamCommit: "same-reference",
    snapshots: [{ pass: true }],
    snapshotFailed: 0,
    capturedRenderCalls: 1,
    renderCalls: 1,
    parityFailed: 1,
    referenceFailed: 0,
    results: [
      {
        id: "dimension-case",
        path: "dimension.test.ts",
        test: "dimension",
        status: "mismatch",
        changedPixels: 10,
        diagnostics: [
          {
            elementId: "dimension-1",
            type: "pcb_note_dimension",
            message: "Unsupported annotation geometry",
          },
        ],
      },
    ],
    referenceTests: [
      {
        path: "dimension.test.ts",
        name: "dimension",
        status: "passed",
        caseIds: ["dimension-case"],
      },
    ],
  }
}

test("removing diagnostics without worsening SVG parity is an improvement", () => {
  const base = createParityReport()
  const improved = createParityReport()
  improved.results[0]!.changedPixels = 9
  improved.results[0]!.diagnostics = []

  expect(findParityRegressions(base, improved)).toEqual([])

  improved.results[0]!.diagnostics = [
    {
      elementId: "dimension-1",
      type: "pcb_note_dimension",
      message: "A new diagnostic",
    },
  ]
  expect(findParityRegressions(base, improved)).toHaveLength(1)
})
