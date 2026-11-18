# SQL-миграция Native Places v0.4a — текстовая копия

**Не запускать этот Markdown.** Выполняемый SQL находится в отдельном серверном ZIP. Только после резервной копии и сверки существующих таблиц.

```sql
-- Native Places v0.4a. Run ONLY on the intended DB after backup and SHOW CREATE TABLE checks.
-- Adds isolated FREE directory sources/river segments. No changes to places, payments, existing Don.
-- Requires existing directory_entries.id BIGINT UNSIGNED with InnoDB/utf8mb4.
CREATE TABLE IF NOT EXISTS directory_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(250) NOT NULL,
  source_kind VARCHAR(32) NOT NULL DEFAULT 'other',
  publisher VARCHAR(250) NOT NULL DEFAULT '',
  url VARCHAR(1000) NOT NULL,
  accessed_at DATE NOT NULL,
  published_on DATE NULL,
  license_name VARCHAR(180) NOT NULL DEFAULT '',
  license_url VARCHAR(1000) NOT NULL DEFAULT '',
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_directory_sources_kind (source_kind),
  KEY ix_directory_sources_accessed (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS directory_segments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  river_entry_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(180) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  locality VARCHAR(180) NOT NULL DEFAULT '',
  summary VARCHAR(500) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  geometry_geojson MEDIUMTEXT NULL,
  geometry_source_id BIGINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by_admin_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_directory_segment_river_slug (river_entry_id,slug),
  KEY ix_directory_segment_river_status_order (river_entry_id,status,sort_order),
  KEY ix_directory_segment_geometry_source (geometry_source_id),
  CONSTRAINT fk_directory_segment_river FOREIGN KEY (river_entry_id) REFERENCES directory_entries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_directory_segment_source FOREIGN KEY (geometry_source_id) REFERENCES directory_sources(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
