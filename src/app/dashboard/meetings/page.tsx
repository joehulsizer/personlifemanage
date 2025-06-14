import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { MeetingsPageContent } from '@/components/meetings/meetings-page-content'

export default async function MeetingsPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Get meetings category
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const meetingsCategory = categories?.find(cat => cat.name === 'Meetings')

  if (!meetingsCategory) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Meetings Category Not Found</h2>
        <p className="text-gray-600">Please check your categories setup.</p>
      </div>
    )
  }

  // Fetch meetings (events in the meetings category)
  const { data: meetings } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', meetingsCategory.id)
    .order('start_at', { ascending: true })

  // Fetch contacts (notes with CONTACT: prefix in meetings category)
  const { data: contacts } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', meetingsCategory.id)
    .ilike('title', 'CONTACT:%')
    .order('updated_at', { ascending: false })

  return (
    <MeetingsPageContent
      user={user}
      meetings={meetings || []}
      contacts={contacts || []}
      categories={categories || []}
      meetingsCategoryId={meetingsCategory.id}
    />
  )
}
