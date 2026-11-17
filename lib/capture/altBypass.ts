let altHeldState = false;

export function setAltKeyHeld(held: boolean): void {
  altHeldState = held;
}

export function isAltKeyHeld(): boolean {
  return altHeldState;
}
