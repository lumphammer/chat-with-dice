PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rooms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`created_time` integer NOT NULL,
	`type` text NOT NULL,
	`config` text,
	`durableObjectId` text,
	`deleted_time` integer,
	`theme` text,
	CONSTRAINT `fk_rooms_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_rooms`(`id`, `name`, `description`, `created_by_user_id`, `created_time`, `type`, `config`, `durableObjectId`, `deleted_time`, `theme`) SELECT `id`, `name`, `description`, `created_by_user_id`, `created_time`, `type`, `config`, `durableObjectId`, `deleted_time`, `theme` FROM `rooms`;--> statement-breakpoint
DROP TABLE `rooms`;--> statement-breakpoint
ALTER TABLE `__new_rooms` RENAME TO `rooms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;