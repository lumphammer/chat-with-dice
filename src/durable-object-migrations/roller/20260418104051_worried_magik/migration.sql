PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Messages` (
	`id` text PRIMARY KEY,
	`displayName` text NOT NULL,
	`chatId` text NOT NULL,
	`created_time` integer NOT NULL,
	`rollType` text,
	`formula` text,
	`results` text,
	`chat` text
);
--> statement-breakpoint
INSERT INTO `__new_Messages`(`id`, `displayName`, `chatId`, `created_time`, `rollType`, `formula`, `results`, `chat`) SELECT `id`, `displayName`, `chatId`, `created_time`, `rollType`, `formula`, `results`, `chat` FROM `Messages`;--> statement-breakpoint
DROP TABLE `Messages`;--> statement-breakpoint
ALTER TABLE `__new_Messages` RENAME TO `Messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;