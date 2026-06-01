// oxlint-disable no-await-in-loop
import * as z from "zod";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60_000;

const eventValidator = z.object({
  id: z.string(),
  runAt: z.number(),
  retryCount: z.number().max(MAX_RETRIES).optional(),
});
export type Event = z.infer<typeof eventValidator>;

export abstract class AbstractScheduler {
  constructor(private ctx: DurableObjectState) {
    //
  }
  async scheduleEvent(event: Event) {
    await this.ctx.storage.put(`event:${event.id}`, event);
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm || event.runAt < currentAlarm) {
      await this.ctx.storage.setAlarm(event.runAt);
    }
  }

  async getEventsForId(id: string): Promise<Event[]> {
    const events = await this.ctx.storage.list({ prefix: `event:${id}` });
    return events
      .values()
      .map((event) => eventValidator.parse(event))
      .toArray();
  }

  async alarm() {
    const now = Date.now();
    const events = await this.ctx.storage.list({ prefix: "event:" });
    let nextAlarm = null;

    for (const [key, event] of events) {
      const validatedEvent = eventValidator.safeParse(event);
      if (!validatedEvent.success) {
        await this.ctx.storage.delete(key);
        continue;
      }
      if (validatedEvent.data.runAt <= now) {
        // start by deleting the task, so the handler can tell if any future
        // events of this id exist (if it wants to.)
        await this.ctx.storage.delete(key);
        try {
          // call the event in a try/catch statement
          await this.processEvent(validatedEvent.data);
        } catch (reason) {
          // on error, if it has retries remaining, reschedule
          const retryCount = (validatedEvent.data.retryCount ?? 0) + 1;
          const shouldRetry = retryCount <= MAX_RETRIES;
          console.error(
            `Event ${JSON.stringify(validatedEvent.data)} failed (${shouldRetry ? "will retry" : "will not retry"}):`,
            reason,
          );
          if (shouldRetry) {
            await this.scheduleEvent({
              id: validatedEvent.data.id,
              runAt: now + RETRY_DELAY_MS,
              retryCount,
            });
          }
        }
      }
      // Track the next event time
      if (
        validatedEvent.data.runAt > now &&
        (!nextAlarm || validatedEvent.data.runAt < nextAlarm)
      ) {
        nextAlarm = validatedEvent.data.runAt;
      }
    }

    if (nextAlarm) await this.ctx.storage.setAlarm(nextAlarm);
  }

  protected abstract processEvent(event: Event): Promise<void>;
}
