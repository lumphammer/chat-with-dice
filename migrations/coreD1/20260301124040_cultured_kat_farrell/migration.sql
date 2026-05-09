CREATE TABLE `Rooms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`created_time` integer NOT NULL
);
