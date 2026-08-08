// src/performance/profilerCallback.js
export function profilerCallback(id, phase, actualDuration, baseDuration, startTime, commitTime, interactions) {
  console.log(`[Profiler] ${id} (${phase}) – actual: ${actualDuration.toFixed(2)}ms, base: ${baseDuration.toFixed(2)}ms`);
}
