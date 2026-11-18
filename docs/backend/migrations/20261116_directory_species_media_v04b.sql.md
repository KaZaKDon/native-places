# Миграция Native Places v0.4b — текстовая копия

**НЕ запускать этот Markdown**: используйте SQL из HOST ZIP после резервной копии БД.

```sql
-- Native Places v0.4b: isolated admin-only species, evidence and private photographs.
-- Before running: FULL DATABASE BACKUP; verify v0.4a tables and their BIGINT UNSIGNED/InnoDB keys.
-- Do not run on other projects. No ALTER of existing tables; no publication of new entities.
CREATE TABLE IF NOT EXISTS directory_species (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(160) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'fish',
  common_name VARCHAR(180) NOT NULL,
  scientific_name VARCHAR(180) NULL,
  summary VARCHAR(500) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by_admin_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_directory_species_slug (slug),
  KEY ix_directory_species_kind_status (kind, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS directory_species_occurrences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  species_id BIGINT UNSIGNED NOT NULL,
  entry_id BIGINT UNSIGNED NOT NULL,
  segment_id BIGINT UNSIGNED NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  evidence_level VARCHAR(24) NOT NULL,
  notes TEXT NOT NULL,
  verified_at DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by_admin_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_dso_entry_segment (entry_id, segment_id, status),
  KEY ix_dso_species (species_id, status),
  KEY ix_dso_source (source_id),
  CONSTRAINT fk_dso_species FOREIGN KEY (species_id) REFERENCES directory_species(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dso_entry FOREIGN KEY (entry_id) REFERENCES directory_entries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dso_segment FOREIGN KEY (segment_id) REFERENCES directory_segments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dso_source FOREIGN KEY (source_id) REFERENCES directory_sources(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- v0.4b privacy-first implementation: image bytes are stored in MySQL rather than a potentially
-- public web directory. This avoids exposing drafts through nginx/Caddy even if .htaccess is ignored.
-- New versions may migrate blobs to private storage outside the document root.
CREATE TABLE IF NOT EXISTS directory_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  storage_path VARCHAR(500) NOT NULL DEFAULT 'db:private',
  image_data MEDIUMBLOB NOT NULL,
  mime VARCHAR(50) NOT NULL,
  width INT UNSIGNED NOT NULL,
  height INT UNSIGNED NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  caption VARCHAR(300) NOT NULL DEFAULT '',
  alt_text VARCHAR(300) NOT NULL DEFAULT '',
  author VARCHAR(250) NOT NULL,
  license_name VARCHAR(180) NOT NULL,
  license_url VARCHAR(1000) NOT NULL DEFAULT '',
  source_url VARCHAR(1000) NOT NULL DEFAULT '',
  attribution TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by_admin_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_directory_media_hash (sha256),
  KEY ix_directory_media_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS directory_media_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_id BIGINT UNSIGNED NOT NULL,
  entry_id BIGINT UNSIGNED NULL,
  segment_id BIGINT UNSIGNED NULL,
  species_id BIGINT UNSIGNED NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_cover TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY ux_directory_media_single_owner (media_id),
  KEY ix_directory_media_link_entry (entry_id),
  KEY ix_directory_media_link_segment (segment_id),
  KEY ix_directory_media_link_species (species_id, sort_order),
  CONSTRAINT fk_dml_media FOREIGN KEY (media_id) REFERENCES directory_media(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dml_entry FOREIGN KEY (entry_id) REFERENCES directory_entries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dml_segment FOREIGN KEY (segment_id) REFERENCES directory_segments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dml_species FOREIGN KEY (species_id) REFERENCES directory_species(id) ON DELETE RESTRICT,
  CONSTRAINT ck_dml_one_owner CHECK (
    (entry_id IS NOT NULL) + (segment_id IS NOT NULL) + (species_id IS NOT NULL) = 1
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

```
