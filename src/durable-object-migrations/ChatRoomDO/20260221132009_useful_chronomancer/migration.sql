CREATE TABLE `Messages` (
	`id` text PRIMARY KEY,
	`user` text NOT NULL,
	`created_time` integer NOT NULL,
	`formula` text NOT NULL,
	`result` text NOT NULL,
	`total` integer NOT NULL
);
