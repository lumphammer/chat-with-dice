PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_room_resource_shares` (
	`id` text PRIMARY KEY,
	`room_id` text NOT NULL,
	`room_durable_object_id` text NOT NULL,
	`node_id` text NOT NULL,
	`shared_time` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_room_resource_shares_node_id_nodes_id_fk` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE,
	CONSTRAINT `room_resource_shares__room_id__node_id_idx` UNIQUE(`room_id`,`node_id`)
);
--> statement-breakpoint
INSERT INTO `__new_room_resource_shares`(`id`, `room_id`, `room_durable_object_id`, `node_id`, `shared_time`) SELECT `id`, `room_id`, `room_durable_object_id`, `node_id`, `shared_time` FROM `room_resource_shares`;--> statement-breakpoint
DROP TABLE `room_resource_shares`;--> statement-breakpoint
ALTER TABLE `__new_room_resource_shares` RENAME TO `room_resource_shares`;--> statement-breakpoint
PRAGMA foreign_keys=ON;