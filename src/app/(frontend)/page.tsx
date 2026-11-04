import config from '@payload-config'
import { getPayload } from 'payload'
import { currentUser } from '@/lib/app-auth'
import { AuthScreen } from './components/AuthScreen'
import { SagarApp } from './components/SagarApp'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const user = await currentUser()

  if (!user) {
    const users = await payload.count({ collection: 'users', overrideAccess: true })
    return <AuthScreen setup={users.totalDocs === 0} />
  }

  const [products, dealers, customers, purchases, sales, expenses] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 500,
      sort: 'brand',
      overrideAccess: false,
      user,
    }),
    payload.find({ collection: 'dealers', limit: 500, sort: 'name', overrideAccess: false, user }),
    payload.find({
      collection: 'customers',
      limit: 500,
      sort: '-lastPurchaseDate',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'purchases',
      limit: 500,
      sort: '-purchasedAt',
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'sales',
      limit: 1000,
      sort: '-soldAt',
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'expenses',
      limit: 1000,
      sort: '-expenseAt',
      overrideAccess: false,
      user,
    }),
  ])

  return (
    <SagarApp
      userName={user.name}
      initialData={JSON.parse(
        JSON.stringify({
          products: products.docs,
          dealers: dealers.docs,
          customers: customers.docs,
          purchases: purchases.docs,
          sales: sales.docs,
          expenses: expenses.docs,
        }),
      )}
    />
  )
}
