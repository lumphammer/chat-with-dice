PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`is_anonymous` integer DEFAULT false,
	`chat_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `role`, `banned`, `ban_reason`, `ban_expires`, `is_anonymous`, `chat_id`) SELECT `id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `role`, `banned`, `ban_reason`, `ban_expires`, `is_anonymous`, `chat_id` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;