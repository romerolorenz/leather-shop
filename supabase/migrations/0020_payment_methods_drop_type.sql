-- Course correction to 0019_payment_methods.sql (already run against the
-- dev DB): payment methods no longer distinguish bank transfer vs.
-- e-wallet — one flat, admin-orderable list instead of two independently
-- positioned ones. Table is empty in production (feature hadn't been used
-- yet), so this is a plain column drop with no data to migrate.

alter table payment_methods drop column type;
