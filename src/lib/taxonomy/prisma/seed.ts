
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
import { PrismaClient } from '@prisma/client'
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
