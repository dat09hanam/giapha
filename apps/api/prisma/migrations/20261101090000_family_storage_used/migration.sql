-- Bytes a family's media folder takes, so reading usage no longer lists files on disk. Starts at 0;
-- the storage reconcile job measures every family's folder when the API starts and nightly after.
ALTER TABLE `Family`
    ADD COLUMN `storageUsedBytes` BIGINT NOT NULL DEFAULT 0;
