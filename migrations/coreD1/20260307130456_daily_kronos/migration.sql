PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Rooms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`created_time` integer NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_Rooms`(`id`, `name`, `description`, `created_by_user_id`, `created_time`, `type`) SELECT `id`, `name`, `description`, `created_by_user_id`, `created_time`, `type` FROM `Rooms`;--> statement-breakpoint
DROP TABLE `Rooms`;--> statement-breakpoint
ALTER TABLE `__new_Rooms` RENAME TO `Rooms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;