/* manually tweaked to dodge around sqlite being case-insensitive on table
   names */
ALTER TABLE `Rooms` RENAME TO `rooms2`;--> statement-breakpoint

ALTER TABLE `rooms2` RENAME TO `rooms`;
