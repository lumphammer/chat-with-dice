PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Messages` (
	`id` text PRIMARY KEY,
	`username` text NOT NULL,
	`userId` text NOT NULL,
	`created_time` integer NOT NULL,
	`formula` text,
	`result` text,
	`total` integer
);
--> statement-breakpoint
INSERT INTO `__new_Messages`(`id`, `username`, `userId`, `created_time`, `formula`, `result`, `total`) SELECT `id`, `username`, `userId`, `created_time`, `formula`, `result`, `total` FROM `Messages`;--> statement-breakpoint
DROP TABLE `Messages`;--> statement-breakpoint
ALTER TABLE `__new_Messages` RENAME TO `Messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;