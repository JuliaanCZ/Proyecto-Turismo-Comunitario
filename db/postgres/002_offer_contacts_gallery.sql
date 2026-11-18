ALTER TABLE app.offers ADD COLUMN contact_phone text;
ALTER TABLE app.offers ADD COLUMN contact_email text;
ALTER TABLE app.offers ADD COLUMN featured_key text UNIQUE;
ALTER TABLE app.offer_photos ADD COLUMN position smallint NOT NULL DEFAULT 1 CHECK (position BETWEEN 1 AND 5);
ALTER TABLE app.offer_photos DROP CONSTRAINT offer_photos_pkey;
ALTER TABLE app.offer_photos ADD PRIMARY KEY (offer_id, position);
