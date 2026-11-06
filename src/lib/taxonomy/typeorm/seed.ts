import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm'

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
