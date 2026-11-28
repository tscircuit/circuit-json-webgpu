export function shouldApplyPathColor(type: string, group: string): boolean {
  return (
    type === "pcb_fabrication_note_path" ||
    group === "note" ||
    group === "user_note"
  )
}
