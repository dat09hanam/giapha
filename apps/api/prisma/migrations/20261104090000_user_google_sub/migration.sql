-- Google account a user signs in with ("sub" claim of the Google ID token).
ALTER TABLE `User`
    ADD COLUMN `googleSub` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `User_googleSub_key` ON `User`(`googleSub`);
