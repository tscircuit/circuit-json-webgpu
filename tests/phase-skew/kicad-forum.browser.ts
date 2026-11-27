import { test } from "bun:test"
import { ForumExampleBoard } from "../fixtures/phase-skew/forum-example-board"
import {
  expectPhaseSkewSnapshot,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("the KiCad forum board shows skew on the upper differential pair", async () => {
  const [frame] = await renderPhaseSkewFrames({
    board: ForumExampleBoard(),
    frameOptions: [{ showDifferentialPairPhaseSkew: true }],
  })
  await expectPhaseSkewSnapshot({ name: "kicad-forum", frame })
}, 30_000)
