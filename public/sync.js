// Check at response time: another request may have changed local state while this poll was in flight.
export function shouldApplyRemoteState(currentRevision,nextRevision,{locked=false,force=false}={}) {
  return Number.isSafeInteger(nextRevision)&&nextRevision>currentRevision&&(!locked||force);
}
