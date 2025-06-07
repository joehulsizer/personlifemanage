import { requireAuth } from '@/lib/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { DiaryPageContent } from '@/components/diary/diary-page-content'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export default async function DiaryPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Fetch diary entries
  const { data: diaryEntries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  // Get today's entry
  const todayEntry = diaryEntries?.find(entry => entry.date === todayStr)

  // Get recent entries
  const recentEntries = diaryEntries?.slice(0, 7) || []

  // Calculate streak
  let currentStreak = 0
  let checkDate = new Date()

  while (currentStreak < 365) { // Max check 1 year
    const dateStr = format(checkDate, 'yyyy-MM-dd')
    const hasEntry = diaryEntries?.some(entry => entry.date === dateStr)

    if (hasEntry) {
      currentStreak++
      checkDate = subDays(checkDate, 1)
    } else {
      break
    }
  }

  // Get calendar data for current month
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  return (
    <DiaryPageContent
      user={user}
      today={today}
      todayStr={todayStr}
      diaryEntries={diaryEntries || []}
      todayEntry={todayEntry}
      recentEntries={recentEntries}
      currentStreak={currentStreak}
      monthDays={monthDays}
    />
  )
}
