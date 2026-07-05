-- Auto-generated taxonomy schema from taxonomy.json
-- Version: 1.0.0

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(80) PRIMARY KEY,
  parent_id VARCHAR(80) REFERENCES categories(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level > 0 AND level <= 4),
  slug VARCHAR(120) NOT NULL,
  icon VARCHAR(60) NOT NULL,
  image VARCHAR(255) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_leaf BOOLEAN NOT NULL DEFAULT FALSE,
  name JSONB NOT NULL,
  seo_title JSONB,
  seo_description JSONB,
  keywords JSONB,
  synonyms JSONB,
  typos JSONB,
  close_categories JSONB,
  allowed_units JSONB NOT NULL,
  required_attributes JSONB NOT NULL,
  optional_attributes JSONB NOT NULL,
  search_filters JSONB NOT NULL,
  supports_wholesale BOOLEAN NOT NULL DEFAULT TRUE,
  supports_dropshipping BOOLEAN NOT NULL DEFAULT TRUE,
  supports_group_buying BOOLEAN NOT NULL DEFAULT TRUE,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0800,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_slug UNIQUE (slug),
  CONSTRAINT check_leaf CHECK (
    (is_leaf = TRUE AND (required_attributes IS NOT NULL)) OR
    (is_leaf = FALSE)
  )
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_leaf ON categories(is_leaf);
CREATE INDEX IF NOT EXISTS idx_categories_active_parent ON categories(is_active, parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_name_fr ON categories((name->>'fr'));
CREATE INDEX IF NOT EXISTS idx_categories_name_en ON categories((name->>'en'));
CREATE INDEX IF NOT EXISTS idx_categories_keywords ON categories USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_categories_synonyms ON categories USING GIN (synonyms);

CREATE TABLE IF NOT EXISTS category_evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_id VARCHAR(80) NOT NULL,
  new_id VARCHAR(80) NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('merge','split','rename','deprecate')),
  migrated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_category_evolution_old_id ON category_evolution(old_id);
CREATE INDEX IF NOT EXISTS idx_category_evolution_new_id ON category_evolution(new_id);
