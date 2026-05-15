CREATE TABLE `shared_nodes` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`node_id` text NOT NULL,
	`kind` text NOT NULL,
	`r2_key` text
);
