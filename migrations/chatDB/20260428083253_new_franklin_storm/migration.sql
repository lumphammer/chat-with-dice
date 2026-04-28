CREATE TABLE `files` (
	`id` text PRIMARY KEY,
	`owner_user_id` text NOT NULL,
	`parent_folder_id` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`r2_key` text NOT NULL,
	`status` text NOT NULL,
	`created_time` integer NOT NULL,
	`deleted_time` integer,
	CONSTRAINT `fk_files_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_files_parent_folder_id_folders_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY,
	`owner_user_id` text NOT NULL,
	`parent_folder_id` text,
	`name` text NOT NULL,
	`created_time` integer NOT NULL,
	`deleted_time` integer,
	CONSTRAINT `fk_folders_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_folders_parent_folder_id_folders_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `room_resource_shares` (
	`id` text PRIMARY KEY,
	`room_id` text NOT NULL,
	`shared_by_user_id` text NOT NULL,
	`file_id` text,
	`folder_id` text,
	`shared_time` integer NOT NULL,
	CONSTRAINT `fk_room_resource_shares_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_room_resource_shares_shared_by_user_id_users_id_fk` FOREIGN KEY (`shared_by_user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_room_resource_shares_file_id_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_room_resource_shares_folder_id_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE,
	CONSTRAINT "exactly_one_target" CHECK(("file_id" IS NULL) != ("folder_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE `users` ADD `storage_quota_bytes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `storage_used_bytes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `files__owner_user_id__parent_folder_id_idx` ON `files` (`owner_user_id`,`parent_folder_id`);--> statement-breakpoint
CREATE INDEX `files__parent_folder_id__name_idx` ON `files` (`parent_folder_id`,`name`);--> statement-breakpoint
CREATE INDEX `files__status__created_time_idx` ON `files` (`status`,`created_time`);--> statement-breakpoint
CREATE INDEX `files__deleted_time_idx` ON `files` (`deleted_time`);--> statement-breakpoint
CREATE INDEX `folders__owner_user_id_idx` ON `folders` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `folders__parent_folder_id__name_idx` ON `folders` (`parent_folder_id`,`name`);--> statement-breakpoint
CREATE INDEX `folders__created_time_idx` ON `folders` (`created_time`);--> statement-breakpoint
CREATE INDEX `folders__deleted_time_idx` ON `folders` (`deleted_time`);--> statement-breakpoint
CREATE INDEX `room_resource_shares__room_id__file_id_idx` ON `room_resource_shares` (`room_id`,`file_id`);--> statement-breakpoint
CREATE INDEX `room_resource_shares__room_id__folder_id_idx` ON `room_resource_shares` (`room_id`,`folder_id`);--> statement-breakpoint
CREATE INDEX `room_resource_shares__shared_by_user_id_idx` ON `room_resource_shares` (`shared_by_user_id`);