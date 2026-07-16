import { z } from 'zod'

export const orderCreateSchema = z.object({
  cart: z.array(
    z.object({
      id: z.string().min(1),
      qty: z.number().int().min(1).default(1),
      name: z.string().optional(),
      variantId: z.string().optional(),
      variantIds: z.array(z.string()).optional(),
      variantLabels: z.array(z.string()).optional(),
      shipping: z.record(z.string(), z.any()).optional(),
    })
  ).min(1),
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  address: z.object({
    region: z.string().min(1),
    department: z.string().min(1),
    neighborhood: z.string().min(1),
    street: z.string().min(1),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    additionalInfo: z.string().optional(),
    notes: z.string().optional(),
  }),
  shippingMethod: z.string().optional(),
})

export const paymentInitSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(['wave', 'orange_money', 'free_money', 'cash']),
  clientPhone: z.string().min(8),
  phase: z.enum(['deposit', 'balance', 'full']).optional().default('full'),
})

export const offerPaymentInitSchema = z.object({
  offerId: z.string().min(1),
  provider: z.enum(['wave', 'orange_money', 'free_money', 'cash']),
  clientPhone: z.string().min(8).optional(),
  phase: z.enum(['deposit', 'balance', 'full']).optional().default('full'),
  useEscrow: z.boolean().optional(),
})

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    return { success: false, error: result.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }
  }
  return { success: true, data: result.data }
}
