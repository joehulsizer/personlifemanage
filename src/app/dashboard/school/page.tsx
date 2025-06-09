import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { SchoolPageContent } from '@/components/school/school-page-content'

export default async function SchoolPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Get school category ID
  const { data: schoolCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'School')
    .single()

  if (!schoolCategory) {
    return (
      <div className="p-8 text-center">
        <div className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">School Category Not Found</h2>
        <p className="text-gray-600">Please check your categories setup.</p>
      </div>
    )
  }

  // Fetch school-related tasks (assignments, projects, etc.) with categories
  const { data: assignments } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('category_id', schoolCategory.id)
    .order('due_date', { ascending: true })

  // Fetch school events (lectures, exams, etc.)
  const { data: schoolEvents } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', schoolCategory.id)
    .order('start_at', { ascending: true })

  // Get all categories for dropdowns
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return (
    <SchoolPageContent
      user={user}
      assignments={assignments || []}
      schoolEvents={schoolEvents || []}
      categories={categories || []}
      schoolCategoryId={schoolCategory.id}
    />
  )
}
