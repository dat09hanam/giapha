-- Email is optional on the public registration form; phone stays the required contact channel.
ALTER TABLE `ServiceRegistration`
    MODIFY `email` VARCHAR(191) NULL;
