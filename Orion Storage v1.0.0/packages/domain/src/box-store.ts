import type { Box } from "./box";
import { assertBoxCodeAvailable, type BoxCodeLedger } from "./box-code";

export type BoxPersistenceState = {
  boxes: Box[];
  codeLedger: BoxCodeLedger;
};

/** Rejects a second box with the same operational code. Does not allocate. */
export function insertBox(state: BoxPersistenceState, box: Box): BoxPersistenceState {
  assertBoxCodeAvailable(
    box.code,
    state.boxes.map((item) => item.code),
  );
  return {
    boxes: [...state.boxes, box],
    codeLedger: state.codeLedger,
  };
}
