ALTER TABLE `account` RENAME TO `accounts`;--> statement-breakpoint
ALTER TABLE `session` RENAME TO `sessions`;--> statement-breakpoint
ALTER TABLE `user` RENAME TO `users`;--> statement-breakpoint
ALTER TABLE `verification` RENAME TO `verifications`;--> statement-breakpoint
DROP INDEX IF EXISTS `account_userId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `session_userId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `verification_identifier_idx`;--> statement-breakpoint
CREATE INDEX `accounts_userId_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_userId_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);