import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { WorkPageContent } from '@/components/work/work-page-content'

export default async function WorkPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Get work category ID
  const { data: workCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Work')
    .single()

  if (!workCategory) {
    return (
      <div className="p-8 text-center">
        <div className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Work Category Not Found</h2>
        <p className="text-gray-600">Please check your categories setup.</p>
      </div>
    )
  }

  // Fetch work-related tasks with categories
  const { data: workTasks } = await supabase
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
    .eq('category_id', workCategory.id)
    .order('due_date', { ascending: true })

  // Fetch work events (meetings, deadlines, etc.)
  const { data: workEvents } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', workCategory.id)
    .order('start_at', { ascending: true })

  // Fetch work projects with their tasks
  const { data: workProjects } = await supabase
    .from('projects')
    .select(`
      *,
      project_tasks (
        id,
        title,
        status,
        due_date,
        description,
        created_at,
        completed_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get all categories for dropdowns
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return (
    <WorkPageContent
      user={user}
      workTasks={workTasks || []}
      workEvents={workEvents || []}
      workProjects={workProjects || []}
      categories={categories || []}
      workCategoryId={workCategory.id}
    />
  )
}
