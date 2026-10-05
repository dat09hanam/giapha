-- Quỹ họ: each ledger line records the day the money moved (occurredOn), which the clan head
-- enters and the ledger is ordered by. Lines written before this get the day they were recorded,
-- in Vietnam time (createdAt is stored in UTC).

-- AlterTable
ALTER TABLE `FundEntry` ADD COLUMN `occurredOn` DATE NULL;
UPDATE `FundEntry` SET `occurredOn` = DATE(DATE_ADD(`createdAt`, INTERVAL 7 HOUR));
ALTER TABLE `FundEntry` MODIFY `occurredOn` DATE NOT NULL;

-- CreateIndex (before the drop: the family foreign key needs an index on familyId throughout)
CREATE INDEX `FundEntry_familyId_occurredOn_idx` ON `FundEntry`(`familyId`, `occurredOn`);

-- DropIndex
DROP INDEX `FundEntry_familyId_createdAt_idx` ON `FundEntry`;
