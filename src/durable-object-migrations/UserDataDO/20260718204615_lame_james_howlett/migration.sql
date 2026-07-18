CREATE TABLE `deck_individual_backs` (
	`deck_id` text NOT NULL,
	`front_id` text NOT NULL,
	`back_id` text NOT NULL,
	CONSTRAINT `deck_individual_backs_pk` PRIMARY KEY(`deck_id`, `front_id`),
	CONSTRAINT `fk_deck_individual_backs_deck_id_decks_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON DELETE CASCADE
);
