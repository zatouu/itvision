import CreateGroupWizard from '@/components/group-orders/CreateGroupWizard'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string | undefined }>
}) {
  const { productId } = await searchParams
  return <CreateGroupWizard preselectedId={productId || null} />
}
