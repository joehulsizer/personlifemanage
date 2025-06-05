import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { TasksPageContent } from '@/components/tasks/tasks-page-content'

export default async function TasksPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Fetch all tasks for the user across categories
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (name, icon, color)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch all categories for filters
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  // Group tasks by status
  const pendingTasks = tasks?.filter(t => t.status === 'pending') || []
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || []
  const completedTasks = tasks?.filter(t => t.status === 'completed') || []
  const overdueTasks = pendingTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date()
  )

  // Group by priority
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high')
  const mediumPriorityTasks = pendingTasks.filter(t => t.priority === 'medium')
  const lowPriorityTasks = pendingTasks.filter(t => t.priority === 'low')

  // Group by category
  const tasksByCategory = tasks?.reduce((acc, task) => {
    const categoryName = task.categories?.name || 'Uncategorized'
    if (!acc[categoryName]) acc[categoryName] = []
    acc[categoryName].push(task)
    return acc
  }, {} as Record<string, typeof tasks>) || {}

  return (
    <TasksPageContent 
      tasks={tasks}
      categories={categories}
      pendingTasks={pendingTasks}
      inProgressTasks={inProgressTasks}
      completedTasks={completedTasks}
      overdueTasks={overdueTasks}
      highPriorityTasks={highPriorityTasks}
      mediumPriorityTasks={mediumPriorityTasks}
      lowPriorityTasks={lowPriorityTasks}
      tasksByCategory={tasksByCategory}
    />
  )
}
