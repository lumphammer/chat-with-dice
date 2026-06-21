ALTER TABLE `Messages` RENAME COLUMN `results` TO `capability_data`;--> statement-breakpoint
ALTER TABLE `Messages` DROP COLUMN `formula`;