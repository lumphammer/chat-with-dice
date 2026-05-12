ALTER TABLE `users`
ADD `user_data_do_id` text;

--> statement-breakpoint
DROP INDEX IF EXISTS `nodes_parent_name_live`;

--> statement-breakpoint
DROP INDEX IF EXISTS `nodes_root_name_live`;

--> statement-breakpoint
DROP INDEX IF EXISTS `room_resource_shares__room_id__node_id_idx`;

--> statement-breakpoint
CREATE INDEX `users_user_data_do_id_idx` ON `users` (`user_data_do_id`);

--> statement-breakpoint
DROP TABLE IF EXISTS `nodes`;

--> statement-breakpoint
DROP TABLE IF EXISTS `folders`;

--> statement-breakpoint
DROP TABLE IF EXISTS `files`;

--> statement-breakpoint
DROP TABLE IF EXISTS `room_resource_shares`;
