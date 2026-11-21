-- Native Places v0.4d. Apply once after a full database backup, before PHP/React updates.
-- Legal and boundary metadata for protected areas and hunting grounds. No entries are seeded.
CREATE TABLE IF NOT EXISTS directory_territory_details (
    entry_id BIGINT UNSIGNED NOT NULL,
    official_category VARCHAR(60) NOT NULL DEFAULT '',
    official_name VARCHAR(180) NOT NULL DEFAULT '',
    managing_body VARCHAR(180) NOT NULL DEFAULT '',
    legal_basis_url VARCHAR(700) NOT NULL DEFAULT '',
    boundary_source_url VARCHAR(700) NOT NULL DEFAULT '',
    access_rules TEXT NOT NULL,
    access_source_url VARCHAR(700) NOT NULL DEFAULT '',
    checked_at DATE DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (entry_id),
    CONSTRAINT fk_directory_territory_entry FOREIGN KEY (entry_id)
      REFERENCES directory_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
