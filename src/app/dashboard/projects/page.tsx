import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { ProjectsPageContent } from '@/components/projects/projects-page-content'

export default async function ProjectsPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Fetch all projects with their tasks
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      project_tasks (
        id,
        title,
        description,
        status,
        due_date,
        created_at,
        completed_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <ProjectsPageContent
      user={user}
      projects={projects || []}
    />
  )
}
