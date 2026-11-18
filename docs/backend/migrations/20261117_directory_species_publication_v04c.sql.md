-- Native Places v0.4c. Run after a full database backup and v0.4b tables check.
-- Adds an audit trail for publishing/unpublishing species; does not touch ads or existing fish data.
CREATE TABLE IF NOT EXISTS directory_species_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    species_id BIGINT UNSIGNED NOT NULL,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(24) NOT NULL,
    event_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_directory_species_events (species_id, event_at),
    CONSTRAINT fk_directory_species_events_species FOREIGN KEY (species_id)
      REFERENCES directory_species(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
