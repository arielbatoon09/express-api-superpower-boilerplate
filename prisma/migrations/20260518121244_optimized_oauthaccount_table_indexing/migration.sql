-- DropIndex
DROP INDEX "tbl_users_id_email_role_email_verified_at_idx";

-- CreateIndex
CREATE INDEX "tbl_accounts_user_id_idx" ON "tbl_accounts"("user_id");
