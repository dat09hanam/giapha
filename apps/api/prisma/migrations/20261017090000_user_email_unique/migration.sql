-- One email belongs to one account, so Quên mật khẩu can be asked by email as well as username.
-- MySQL allows any number of NULLs under a unique index.
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);
