import { Schema, model, models } from 'mongoose'

const SubCategorySchema = new Schema({
  slug: { type: String, required: true },
  label_fr: { type: String, required: true },
  label_wo: { type: String },
  label_en: { type: String },
}, { _id: false })

const AttributeSchema = new Schema({
  slug: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'select', 'boolean'], required: true },
  label_fr: { type: String, required: true },
  label_wo: { type: String },
  label_en: { type: String },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: false },
}, { _id: false })

const ServiceCategorySchema = new Schema({
  slug: { type: String, required: true, unique: true },
  label_fr: { type: String, required: true },
  label_wo: { type: String },
  label_en: { type: String },
  abbr: { type: String, required: true, maxlength: 3 },
  color: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  subCategories: { type: [SubCategorySchema], default: [] },
  requiredAttributes: { type: [AttributeSchema], default: [] },
  optionalAttributes: { type: [AttributeSchema], default: [] },
}, { timestamps: true })

ServiceCategorySchema.index({ isActive: 1, order: 1 })

const ServiceCategory = models.ServiceCategory || model('ServiceCategory', ServiceCategorySchema)
export default ServiceCategory
