// Cloudflare subrequest limits are per Worker or Durable Object invocation.
// The strict lower bound is 50 subrequests on the Free plan, so repair actions
// process at most 40 R2 calls per invocation to leave headroom for surrounding
// runtime and service-binding work. Batches of 10 keep concurrency modest inside
// that cap; callers can report deferred work and let admins rerun the repair.
export const R2_REPAIR_BATCH_SIZE = 10;
export const R2_REPAIR_SUBREQUEST_BUDGET = 40;
