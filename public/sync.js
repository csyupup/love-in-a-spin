// Never replace a newer saved revision or redraw the wheel while an interaction is locked.
export function shouldApplyRemoteState(currentRevision,nextRevision,{locked=false,force=false}={}) {
  return Number.isSafeInteger(nextRevision)&&nextRevision>currentRevision&&(!locked||force);
}
