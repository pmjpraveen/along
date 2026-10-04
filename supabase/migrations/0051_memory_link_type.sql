-- A memory can be a link to Google Photos. The new value is added here on its own: it cannot be used in the same transaction that adds it,
-- so the columns, checks and function that use it follow in the next migration.
alter type memory_type add value if not exists 'link';
