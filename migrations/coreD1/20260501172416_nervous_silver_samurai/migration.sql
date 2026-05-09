PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_nodes` (
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
INSERT INTO `__new_nodes`(`id`, `name`, `parent_folder_id`, `created_time`, `deleted_time`, `folder_id`, `file_id`, `owner_user_id`) SELECT `id`, `name`, `parent_folder_id`, `created_time`, `deleted_time`, `folder_id`, `file_id`, `owner_user_id` FROM `nodes`;--> statement-breakpoint
DROP TABLE `nodes`;--> statement-breakpoint
ALTER TABLE `__new_nodes` RENAME TO `nodes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `nodes_parent_name_live` ON `nodes` (`parent_folder_id`,`name`) WHERE "nodes"."deleted_time" IS NULL;