import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT = resolve(__dirname)

interface Taxonomy {
  version: string
  generatedAt: string
  schema: { maxDepth: number; supportedLanguages: string[]; currency: string; defaultUnit: string }
  categories: Category[]
}

interface Category {
  id: string
  parent_id: string | null
  level: number
  name: Record<string, string>
  slug: string
  icon: string
  image: string
  order: number
  isActive: boolean
  isLeaf: boolean
  seoTitle: Record<string, string>
  seoDescription: Record<string, string>
  keywords: Record<string, string[]>
  synonyms?: Record<string, string[]>
  typos?: string[]
  closeCategories?: string[]
  allowedUnits: string[]
  requiredAttributes: string[]
  optionalAttributes: string[]
  searchFilters: string[]
  supportsWholesale: boolean
  supportsDropshipping: boolean
  supportsGroupBuying: boolean
  commissionRate: number
  createdAt: string
  updatedAt: string
}

const data: Taxonomy = JSON.parse(readFileSync(resolve(ROOT, 'taxonomy.json'), 'utf8'))
const categories = data.categories

function out(rel: string, content: string) {
  const p = resolve(ROOT, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
}

function sqlJson(value: any): string {
  return JSON.stringify(JSON.stringify(value ?? null))
}

function sqlArray(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "'{}'"
  return "'{" + values.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',') + "}'"
}

function sqlString(value: string | null | undefined): string {
  if (value == null) return 'NULL'
  return "'" + value.replace(/'/g, "''") + "'"
}

function sqlBool(value: boolean): string {
  return value ? 'TRUE' : 'FALSE'
}

function sqlDecimal(value: number): string {
  return value.toString()
}

// 1. SQL Schema
const schemaSQL = `-- Auto-generated taxonomy schema from taxonomy.json
-- Version: ${data.version}

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(80) PRIMARY KEY,
  parent_id VARCHAR(80) REFERENCES categories(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level > 0 AND level <= ${data.schema.maxDepth}),
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
`

out('taxonomy.schema.sql', schemaSQL)

// 2. Seed SQL
const insertValues = categories.map(c => `(
  ${sqlString(c.id)}, ${c.parent_id ? sqlString(c.parent_id) : 'NULL'}, ${c.level}, ${sqlString(c.slug)}, ${sqlString(c.icon)}, ${sqlString(c.image)}, ${c.order}, ${sqlBool(c.isActive)}, ${sqlBool(c.isLeaf)},
  ${sqlJson(c.name)}, ${sqlJson(c.seoTitle)}, ${sqlJson(c.seoDescription)}, ${sqlJson(c.keywords)}, ${sqlJson(c.synonyms)}, ${sqlArray(c.typos)}, ${sqlArray(c.closeCategories)},
  ${sqlJson(c.allowedUnits)}, ${sqlJson(c.requiredAttributes)}, ${sqlJson(c.optionalAttributes)}, ${sqlJson(c.searchFilters)},
  ${sqlBool(c.supportsWholesale)}, ${sqlBool(c.supportsDropshipping)}, ${sqlBool(c.supportsGroupBuying)}, ${sqlDecimal(c.commissionRate)},
  ${sqlString(c.createdAt)}, ${sqlString(c.updatedAt)}
)`)

const seedSQL = `-- Auto-generated taxonomy seed from taxonomy.json
-- Version: ${data.version}
-- Categories: ${categories.length}

BEGIN;

INSERT INTO categories (
  id, parent_id, level, slug, icon, image, order_index, is_active, is_leaf,
  name, seo_title, seo_description, keywords, synonyms, typos, close_categories,
  allowed_units, required_attributes, optional_attributes, search_filters,
  supports_wholesale, supports_dropshipping, supports_group_buying, commission_rate, created_at, updated_at
) VALUES
${insertValues.join(',\n')};

COMMIT;
`

out('taxonomy.seed.sql', seedSQL)

// 3. Prisma seed
const prismaModel = `
// Add to schema.prisma:
// model Category {
//   id                   String   @id @db.VarChar(80)
//   parentId             String?  @db.VarChar(80)
//   parent               Category? @relation("CategoryChildren", fields: [parentId], references: [id], onDelete: Cascade)
//   children             Category[] @relation("CategoryChildren")
//   level                Int
//   slug                 String   @unique @db.VarChar(120)
//   icon                 String   @db.VarChar(60)
//   image                String   @db.VarChar(255)
//   orderIndex           Int      @default(0) @map("order_index")
//   isActive             Boolean  @default(true) @map("is_active")
//   isLeaf               Boolean  @default(false) @map("is_leaf")
//   name                 Json
//   seoTitle             Json?    @map("seo_title")
//   seoDescription       Json?    @map("seo_description")
//   keywords             Json?
//   synonyms             Json?
//   typos                String[]
//   closeCategories      String[] @map("close_categories")
//   allowedUnits         Json     @map("allowed_units")
//   requiredAttributes   Json     @map("required_attributes")
//   optionalAttributes   Json     @map("optional_attributes")
//   searchFilters        Json     @map("search_filters")
//   supportsWholesale    Boolean  @default(true) @map("supports_wholesale")
//   supportsDropshipping Boolean  @default(true) @map("supports_dropshipping")
//   supportsGroupBuying  Boolean  @default(true) @map("supports_group_buying")
//   commissionRate       Decimal  @default(0.08) @map("commission_rate")
//   createdAt            DateTime @default(now()) @map("created_at")
//   updatedAt            DateTime @updatedAt @map("updated_at")
//   @@index([parentId])
//   @@index([level])
//   @@index([slug])
//   @@index([isActive])
//   @@index([isLeaf])
//   @@map("categories")
// }
`

const prismaSeed = `import { PrismaClient } from '@prisma/client'
import taxonomy from '../src/lib/taxonomy/taxonomy.json'

const prisma = new PrismaClient()

async function main() {
  const data = taxonomy.categories.map(c => ({
    id: c.id,
    parentId: c.parent_id,
    level: c.level,
    slug: c.slug,
    icon: c.icon,
    image: c.image,
    orderIndex: c.order,
    isActive: c.isActive,
    isLeaf: c.isLeaf,
    name: c.name,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    keywords: c.keywords,
    synonyms: c.synonyms ?? {},
    typos: c.typos ?? [],
    closeCategories: c.closeCategories ?? [],
    allowedUnits: c.allowedUnits,
    requiredAttributes: c.requiredAttributes,
    optionalAttributes: c.optionalAttributes,
    searchFilters: c.searchFilters,
    supportsWholesale: c.supportsWholesale,
    supportsDropshipping: c.supportsDropshipping,
    supportsGroupBuying: c.supportsGroupBuying,
    commissionRate: c.commissionRate,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }))
  await prisma.category.createMany({ data, skipDuplicates: true })
  console.log('Seeded', data.length, 'categories')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
`

out('prisma/seed.ts', prismaModel + prismaSeed)

// 4. TypeORM seed
const typeormSeed = `import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm'

@Entity('categories')
export class Category {
  @PrimaryColumn('varchar', { length: 80 }) id: string
  @Index()
  @Column('varchar', { length: 80, nullable: true }) parentId: string | null
  @ManyToOne(() => Category, c => c.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null
  @OneToMany(() => Category, c => c.parent)
  children: Category[]
  @Column('int') level: number
  @Column('varchar', { length: 120, unique: true }) slug: string
  @Column('varchar', { length: 60 }) icon: string
  @Column('varchar', { length: 255 }) image: string
  @Column('int', { name: 'order_index' }) orderIndex: number
  @Column('boolean', { name: 'is_active' }) isActive: boolean
  @Column('boolean', { name: 'is_leaf' }) isLeaf: boolean
  @Column('jsonb') name: Record<string, string>
  @Column('jsonb', { name: 'seo_title', nullable: true }) seoTitle: Record<string, string> | null
  @Column('jsonb', { name: 'seo_description', nullable: true }) seoDescription: Record<string, string> | null
  @Column('jsonb', { nullable: true }) keywords: Record<string, string[]> | null
  @Column('jsonb', { nullable: true }) synonyms: Record<string, string[]> | null
  @Column('varchar', { name: 'typos', array: true, default: '{}' }) typos: string[]
  @Column('varchar', { name: 'close_categories', array: true, default: '{}' }) closeCategories: string[]
  @Column('jsonb', { name: 'allowed_units' }) allowedUnits: string[]
  @Column('jsonb', { name: 'required_attributes' }) requiredAttributes: string[]
  @Column('jsonb', { name: 'optional_attributes' }) optionalAttributes: string[]
  @Column('jsonb', { name: 'search_filters' }) searchFilters: string[]
  @Column('boolean', { name: 'supports_wholesale' }) supportsWholesale: boolean
  @Column('boolean', { name: 'supports_dropshipping' }) supportsDropshipping: boolean
  @Column('boolean', { name: 'supports_group_buying' }) supportsGroupBuying: boolean
  @Column('decimal', { name: 'commission_rate', precision: 5, scale: 4 }) commissionRate: number
  @Column('timestamp with time zone', { name: 'created_at' }) createdAt: Date
  @Column('timestamp with time zone', { name: 'updated_at' }) updatedAt: Date
}

export async function seedCategories(dataSource: any) {
  const repo = dataSource.getRepository(Category)
  const categories = await import('../src/lib/taxonomy/taxonomy.json').then(m => m.default.categories)
  await repo.save(
    categories.map((c: any) => repo.create({
      id: c.id,
      parentId: c.parent_id,
      level: c.level,
      slug: c.slug,
      icon: c.icon,
      image: c.image,
      orderIndex: c.order,
      isActive: c.isActive,
      isLeaf: c.isLeaf,
      name: c.name,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      keywords: c.keywords,
      synonyms: c.synonyms ?? {},
      typos: c.typos ?? [],
      closeCategories: c.closeCategories ?? [],
      allowedUnits: c.allowedUnits,
      requiredAttributes: c.requiredAttributes,
      optionalAttributes: c.optionalAttributes,
      searchFilters: c.searchFilters,
      supportsWholesale: c.supportsWholesale,
      supportsDropshipping: c.supportsDropshipping,
      supportsGroupBuying: c.supportsGroupBuying,
      commissionRate: c.commissionRate,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }))
  )
  console.log('Seeded', categories.length, 'categories')
}
`

out('typeorm/seed.ts', typeormSeed)

// 5. Drizzle seed
const drizzleSeed = `import { pgTable, varchar, integer, boolean, jsonb, decimal, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const categories = pgTable('categories', {
  id: varchar('id', { length: 80 }).primaryKey(),
  parentId: varchar('parent_id', { length: 80 }),
  level: integer('level').notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  icon: varchar('icon', { length: 60 }).notNull(),
  image: varchar('image', { length: 255 }).notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  isLeaf: boolean('is_leaf').notNull().default(false),
  name: jsonb('name').notNull(),
  seoTitle: jsonb('seo_title'),
  seoDescription: jsonb('seo_description'),
  keywords: jsonb('keywords'),
  synonyms: jsonb('synonyms'),
  typos: jsonb('typos').default(sql"'[]'"),
  closeCategories: jsonb('close_categories').default(sql"'[]'"),
  allowedUnits: jsonb('allowed_units').notNull(),
  requiredAttributes: jsonb('required_attributes').notNull(),
  optionalAttributes: jsonb('optional_attributes').notNull(),
  searchFilters: jsonb('search_filters').notNull(),
  supportsWholesale: boolean('supports_wholesale').notNull().default(true),
  supportsDropshipping: boolean('supports_dropshipping').notNull().default(true),
  supportsGroupBuying: boolean('supports_group_buying').notNull().default(true),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }).notNull().default('0.0800'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  parentIdx: index('idx_categories_parent_id').on(t.parentId),
  levelIdx: index('idx_categories_level').on(t.level),
  slugIdx: index('idx_categories_slug').on(t.slug),
  activeIdx: index('idx_categories_active').on(t.isActive),
  leafIdx: index('idx_categories_leaf').on(t.isLeaf),
  slugUnique: uniqueIndex('unique_slug').on(t.slug),
}))

export async function seedCategories(db: any) {
  const taxonomy = await import('../src/lib/taxonomy/taxonomy.json')
  await db.insert(categories).values(taxonomy.categories.map((c: any) => ({
    id: c.id,
    parentId: c.parent_id,
    level: c.level,
    slug: c.slug,
    icon: c.icon,
    image: c.image,
    orderIndex: c.order,
    isActive: c.isActive,
    isLeaf: c.isLeaf,
    name: c.name,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    keywords: c.keywords,
    synonyms: c.synonyms ?? {},
    typos: c.typos ?? [],
    closeCategories: c.closeCategories ?? [],
    allowedUnits: c.allowedUnits,
    requiredAttributes: c.requiredAttributes,
    optionalAttributes: c.optionalAttributes,
    searchFilters: c.searchFilters,
    supportsWholesale: c.supportsWholesale,
    supportsDropshipping: c.supportsDropshipping,
    supportsGroupBuying: c.supportsGroupBuying,
    commissionRate: c.commissionRate.toString(),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  })))
  console.log('Seeded', taxonomy.categories.length, 'categories')
}
`

out('drizzle/seed.ts', drizzleSeed)

console.log('Generated SQL, Prisma, TypeORM, Drizzle assets')
