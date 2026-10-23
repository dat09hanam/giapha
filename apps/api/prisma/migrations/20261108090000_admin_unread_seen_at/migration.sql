-- Unread tracking for the admin sidebar: a row stays unread until an admin opens its list.
ALTER TABLE `ServiceRegistration` ADD COLUMN `seenAt` DATETIME(3) NULL;
ALTER TABLE `Ambassador` ADD COLUMN `seenAt` DATETIME(3) NULL;

-- Registrations an admin already handled count as read; NEW ones and all existing
-- ambassador sign-ups surface once as unread.
UPDATE `ServiceRegistration` SET `seenAt` = `updatedAt` WHERE `status` <> 'NEW';
