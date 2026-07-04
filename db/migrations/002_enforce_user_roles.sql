UPDATE users
SET role = CASE
  WHEN LOWER(TRIM(role)) = 'admin' THEN 'admin'
  ELSE 'user'
END
WHERE role IS NULL OR role <> LOWER(TRIM(role)) OR role NOT IN ('admin', 'user');

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));
