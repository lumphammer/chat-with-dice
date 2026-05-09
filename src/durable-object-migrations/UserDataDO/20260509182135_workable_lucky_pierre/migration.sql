CREATE TABLE `files` (
	`id` text PRIMARY KEY,
	`size_bytes` integer NOT NULL,
	`is_ready` integer DEFAULT 0 NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY,
	`recursive_size_bytes` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`parent_folder_id` text,
	`created_time` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_time` integer,
	`folder_id` text,
	`file_id` text,
	`owner_user_id` text,
	CONSTRAINT `fk_nodes_parent_folder_id_folders_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_nodes_folder_id_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_nodes_file_id_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_nodes_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT "id_equals_metadata_fk" CHECK((
        ("file_id" IS NOT NULL)
        AND ("id" == "file_id")
      )
      OR (
        ("folder_id" IS NOT NULL)
        AND ("id" == "folder_id")
      )),
	CONSTRAINT "nodes__file_id_or_folder_id" CHECK((
        "file_id" IS NOT NULL
        AND "folder_id" IS NULL
      )
      OR (
        "file_id" IS NULL
        AND "folder_id" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE `room_resource_shares` (
	`id` text PRIMARY KEY,
	`room_id` text NOT NULL,
	`node_id` text,
	`shared_time` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_room_resource_shares_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_room_resource_shares_node_id_nodes_id_fk` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nodes_parent_name_live` ON `nodes` (`parent_folder_id`,`name`) WHERE "nodes"."deleted_time" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `nodes_root_name_live` ON `nodes` (`name`) WHERE "nodes"."parent_folder_id" IS NULL AND "nodes"."deleted_time" IS NULL;--> statement-breakpoint
CREATE INDEX `room_resource_shares__room_id__node_id_idx` ON `room_resource_shares` (`room_id`,`node_id`);