import CreateGroupWizard from '@/components/group-orders/CreateGroupWizard'

interface Props {
  searchParams: { productId?: string }
}

export default function Page({ searchParams }: Props) {
  return <CreateGroupWizard preselectedId={searchParams.productId || null} />
}
