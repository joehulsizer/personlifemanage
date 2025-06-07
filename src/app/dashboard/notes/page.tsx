import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { NotesPageContent } from '@/components/notes/notes-page-content'

export default async function NotesPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  // Get notes category ID
  const { data: notesCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Notes')
    .single()

  if (!notesCategory) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Notes Category Not Found</h2>
        <p className="text-gray-600">Please check your categories setup.</p>
      </div>
    )
  }

  // Fetch all notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', notesCategory.id)
    .order('updated_at', { ascending: false })

  // Get all categories for potential tagging
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return (
    <NotesPageContent
      user={user}
      notes={notes || []}
      categories={categories || []}
      notesCategoryId={notesCategory.id}
    />
  )
}
