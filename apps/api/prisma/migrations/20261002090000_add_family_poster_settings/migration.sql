-- AlterTable
ALTER TABLE `Family`
    ADD COLUMN `posterBorder` VARCHAR(32) NOT NULL DEFAULT 'red-key',
    ADD COLUMN `posterCenter` VARCHAR(32) NOT NULL DEFAULT 'ribbon',
    ADD COLUMN `posterSide` VARCHAR(32) NOT NULL DEFAULT 'plum',
    ADD COLUMN `posterCoupletLeft` VARCHAR(120) NOT NULL DEFAULT 'Chim có tổ, người có tông',
    ADD COLUMN `posterCoupletRight` VARCHAR(120) NOT NULL DEFAULT 'Cây có cội, nước có nguồn';
