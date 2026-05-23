PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` text PRIMARY KEY,
	`size_bytes` integer NOT NULL,
	`is_ready` integer DEFAULT 0 NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`thumbnail_r_2_key` text,
	`thumbnail_content_type` text,
	`thumbnail_size_bytes` integer,
	CONSTRAINT `fk_files_id_nodes_id_fk` FOREIGN KEY (`id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_files`(`id`, `size_bytes`, `is_ready`, `r2_key`, `content_type`, `thumbnail_r_2_key`, `thumbnail_content_type`, `thumbnail_size_bytes`) SELECT `id`, `size_bytes`, `is_ready`, `r2_key`, `content_type`, `thumbnail_r_2_key`, `thumbnail_content_type`, `thumbnail_size_bytes` FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_folders` (
	`id` text PRIMARY KEY,
	`recursive_size_bytes` integer NOT NULL,
	CONSTRAINT `fk_folders_id_nodes_id_fk` FOREIGN KEY (`id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_folders`(`id`, `recursive_size_bytes`) SELECT `id`, `recursive_size_bytes` FROM `folders`;--> statement-breakpoint
DROP TABLE `folders`;--> statement-breakpoint
ALTER TABLE `__new_folders` RENAME TO `folders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;