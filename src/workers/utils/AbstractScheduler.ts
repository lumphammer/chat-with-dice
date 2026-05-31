// oxlint-disable no-await-in-loop
import * as z from "zod";

const eventValidator = z.object({
  id: z.string(),
  runAt: z.number(),
});
export type Event = z.infer<typeof eventValidator>;

export abstract class AbstractScheduler {
  constructor(private ctx: DurableObjectState) {
    //
  }
  async scheduleEvent(id: string, runAt: number) {
    await this.ctx.storage.put(`event:${id}`, { id, runAt });
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm || runAt < currentAlarm) {
      await this.ctx.storage.setAlarm(runAt);
    }
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
        await this.processEvent(validatedEvent.data);
        await this.ctx.storage.delete(key);
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
