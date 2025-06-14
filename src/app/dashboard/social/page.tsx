import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { SocialPageContent } from '@/components/social/social-page-content'

export default async function SocialPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Get social category ID
  const { data: socialCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Social')
    .single()

  if (!socialCategory) {
    return (
      <div className="p-8 text-center">
        <div className="h-12 w-12 mx-auto bg-pink-100 rounded-lg flex items-center justify-center mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Social Category Not Found</h2>
        <p className="text-gray-600">Please check your categories setup.</p>
      </div>
    )
  }

  // Get all categories for category selection
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  // Fetch social events with category info
  const { data: socialEvents } = await supabase
    .from('events')
    .select(`
      *,
      categories (
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('category_id', socialCategory.id)
    .order('start_at', { ascending: true })

  // Fetch social tasks (social reminders, follow-ups, etc.)
  const { data: socialTasks } = await supabase
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
    .eq('category_id', socialCategory.id)
    .order('created_at', { ascending: false })

  // Fetch contacts (stored as notes with special format)
  const { data: contacts } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', socialCategory.id)
    .ilike('title', 'CONTACT:%')
    .order('updated_at', { ascending: false })

  return (
    <SocialPageContent
      user={user}
      socialEvents={socialEvents || []}
      socialTasks={socialTasks || []}
      contacts={contacts || []}
      categories={categories || []}
      socialCategoryId={socialCategory.id}
    />
  )
}
