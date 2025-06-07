import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { ShoppingPageContent } from '@/components/shopping/shopping-page-content'
import { format, addDays } from 'date-fns'

export default async function ShoppingPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Get shopping category ID
  const { data: shoppingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Shopping')
    .single()

  if (!shoppingCategory) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Shopping Category Not Found</h2>
        <p className="text-gray-600">Please check your categories setup.</p>
      </div>
    )
  }

  // Fetch shopping tasks (general shopping items)
  const { data: shoppingTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', shoppingCategory.id)
    .order('created_at', { ascending: false })

  // Fetch supplement items
  const { data: supplements } = await supabase
    .from('supplement_items')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  // Calculate supplement statuses
  const supplementsWithStatus = supplements?.map(supplement => {
    if (!supplement.quantity_servings || !supplement.servings_per_day) {
      return { ...supplement, daysLeft: null, runOutDate: null, status: 'no-data' as const }
    }

    const daysLeft = Math.floor(supplement.quantity_servings / supplement.servings_per_day)
    const runOutDate = addDays(new Date(), daysLeft)

    let status: 'good' | 'low' | 'warning' | 'critical' = 'good'
    if (daysLeft <= 3) status = 'critical'
    else if (daysLeft <= 7) status = 'warning'
    else if (daysLeft <= 14) status = 'low'

    return { ...supplement, daysLeft, runOutDate, status }
  }) || []

  return (
    <ShoppingPageContent
      user={user}
      shoppingTasks={shoppingTasks || []}
      supplements={supplementsWithStatus}
      categoryId={shoppingCategory.id}
    />
  )
}
