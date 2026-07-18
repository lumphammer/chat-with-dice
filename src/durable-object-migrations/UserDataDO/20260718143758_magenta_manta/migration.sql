ALTER TABLE `decks` ADD `common_back_id` text;--> statement-breakpoint
ALTER TABLE `decks` ADD `allow_face_down` integer DEFAULT 0 NOT NULL;