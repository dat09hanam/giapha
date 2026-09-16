-- Move authentication to a globally unique username while preserving legacy
-- email values as optional contact data. Pending invitations are deliberately
-- suspended because the invitation flow is removed by this release.

ALTER TABLE `Family`
  ADD COLUMN `deathAnniversaryDay` TINYINT UNSIGNED NULL,
  ADD COLUMN `deathAnniversaryMonth` TINYINT UNSIGNED NULL;

ALTER TABLE `User`
  ADD COLUMN `username` VARCHAR(191) NULL;

-- Email was globally unique, so using it as the transitional username keeps
-- existing active accounts usable after deployment without guessing names.
UPDATE `User`
SET `username` = `email`
WHERE `username` IS NULL;

CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- Invitation placeholders must not become login-capable accounts. The hash is
-- intentionally unusable and status remains non-active after enum contraction.
UPDATE `User`
SET `passwordHash` = 'scrypt-v1$Z2lhcGhhLWxvZ2luLWR1bW15LXNhbHQ$hvcnNl11-DqwWnFtHhxSgxOIkpINJGzOMLx8Sh224vqeRP3aQ6zRe830XZL59ruchMuByMilGO4tEbDFFzWlFg',
    `status` = 'SUSPENDED'
WHERE `passwordHash` IS NULL OR `status` = 'INVITED';

ALTER TABLE `User`
  MODIFY `username` VARCHAR(191) NOT NULL,
  MODIFY `email` VARCHAR(191) NULL,
  MODIFY `passwordHash` VARCHAR(255) NOT NULL,
  MODIFY `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';

DROP INDEX `User_invitationTokenHash_key` ON `User`;
ALTER TABLE `User`
  DROP COLUMN `invitationTokenHash`,
  DROP COLUMN `invitationExpiresAt`;

ALTER TABLE `Family`
  ADD CONSTRAINT `Family_death_anniversary_check`
  CHECK (
    (`deathAnniversaryDay` IS NULL AND `deathAnniversaryMonth` IS NULL)
    OR (
      `deathAnniversaryDay` IS NOT NULL
      AND `deathAnniversaryMonth` IS NOT NULL
      AND `deathAnniversaryMonth` BETWEEN 1 AND 12
      AND `deathAnniversaryDay` BETWEEN 1 AND CASE `deathAnniversaryMonth`
        WHEN 2 THEN 29
        WHEN 4 THEN 30
        WHEN 6 THEN 30
        WHEN 9 THEN 30
        WHEN 11 THEN 30
        ELSE 31
      END
    )
  );
