CREATE TABLE `decks` (
	`id` text PRIMARY KEY,
	CONSTRAINT `fk_decks_id_folders_id_fk` FOREIGN KEY (`id`) REFERENCES `folders`(`id`) ON DELETE CASCADE
);
