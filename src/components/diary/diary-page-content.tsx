'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, Calendar, Edit, Heart, Smile, ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DiaryPageContentProps {
  user: any
  today: Date
  todayStr: string
  diaryEntries: any[]
  todayEntry: any
  recentEntries: any[]
  currentStreak: number
  monthDays: Date[]
}

export function DiaryPageContent({
  user,
  today,
  todayStr,
  diaryEntries,
  todayEntry: initialTodayEntry,
  recentEntries: initialRecentEntries,
  currentStreak: initialStreak,
  monthDays: initialMonthDays
}: DiaryPageContentProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [editorContent, setEditorContent] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(today)
  const [isLoading, setIsLoading] = useState(false)

  // Local state for real-time updates
  const [todayEntry, setTodayEntry] = useState(initialTodayEntry)
  const [recentEntries, setRecentEntries] = useState(initialRecentEntries)
  const [currentStreak, setCurrentStreak] = useState(initialStreak)
  const [entries, setEntries] = useState(diaryEntries)

  const supabase = createClient()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const hasEntryForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return entries.some(entry => entry.date === dateStr)
  }

  const getEntryPreview = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const openEditor = (entry?: any, date?: string, prompt?: string) => {
    if (entry) {
      setEditingEntry(entry)
      setEditorContent(entry.content_md || '')
      setSelectedDate(entry.date)
    } else {
      setEditingEntry(null)
      setEditorContent(prompt || '')
      setSelectedDate(date || todayStr)
    }
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditingEntry(null)
    setEditorContent('')
    setSelectedMood(null)
  }

  const saveEntry = async () => {
    if (!editorContent.trim()) {
      toast.error('Please write something before saving!')
      return
    }

    setIsLoading(true)
    try {
      const entryData = {
        user_id: user.id,
        date: selectedDate,
        content_md: editorContent,
        updated_at: new Date().toISOString()
      }

      let result
      if (editingEntry) {
        // Update existing entry
        result = await supabase
          .from('diary_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .select()
          .single()
      } else {
        // Create new entry
        result = await supabase
          .from('diary_entries')
          .insert({
            ...entryData,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      if (result.error) throw result.error

      // Update local state
      const updatedEntry = result.data
      setEntries(prev => {
        const filtered = prev.filter(e => e.id !== updatedEntry.id)
        return [updatedEntry, ...filtered].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      })

      // Update today's entry if it's today's date
      if (selectedDate === todayStr) {
        setTodayEntry(updatedEntry)
      }

      // Update recent entries
      setRecentEntries(prev => {
        const filtered = prev.filter(e => e.id !== updatedEntry.id)
        return [updatedEntry, ...filtered].slice(0, 7)
      })

      toast.success(editingEntry ? 'Entry updated!' : 'Entry saved!')
      closeEditor()
    } catch (error) {
      console.error('Error saving entry:', error)
      toast.error('Failed to save entry')
    } finally {
      setIsLoading(false)
    }
  }

  const saveMood = async (mood: string) => {
    setSelectedMood(mood)
    toast.success(`Mood recorded: ${mood}`)
    // You could save mood to a separate moods table or as metadata
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const moods = [
    { emoji: '😔', label: 'Sad', value: 'sad' },
    { emoji: '😐', label: 'Neutral', value: 'neutral' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '🤩', label: 'Excited', value: 'excited' }
  ]

  const writingPrompts = [
    "What made you smile today?",
    "What are you grateful for?",
    "What did you learn today?",
    "What's on your mind?",
    "Describe a moment that stood out today.",
    "What challenge did you overcome?",
    "What are you looking forward to?",
    "How did you grow today?"
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diary</h1>
            <p className="text-gray-600">Your personal daily journal</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Heart className="h-3 w-3" />
            <span>{currentStreak} day streak</span>
          </Badge>
          <Button 
            size="sm" 
            className="flex items-center space-x-1"
            onClick={() => openEditor()}
          >
            <Edit className="h-4 w-4" />
            <span>Write Today</span>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{currentStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{entries.length}</div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{recentEntries.length}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Smile className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {selectedMood ? moods.find(m => m.value === selectedMood)?.emoji : '😊'}
                </div>
                <div className="text-sm text-gray-600">Today's Mood</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Entry */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Edit className="h-5 w-5" />
                  <span>Today's Entry</span>
                </div>
                <div className="text-sm text-gray-500">
                  {format(today, 'EEEE, MMMM d, yyyy')}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntry ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {todayEntry.content_md}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">
                      Written today
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditor(todayEntry)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No entry for today</h3>
                  <p className="text-gray-500 mb-6">Start writing about your day.</p>
                  <Button 
                    className="flex items-center space-x-2"
                    onClick={() => openEditor()}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Write Entry</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Recent Entries</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEntries.length > 0 ? (
                  recentEntries.map((entry) => (
                    <div key={entry.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          {format(new Date(entry.date), 'EEEE, MMM d')}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditor(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {getEntryPreview(entry.content_md || '')}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No recent entries</p>
                    <p className="text-xs mt-1">Start your journaling journey!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Quick Actions */}
        <div className="space-y-6">
          {/* Mini Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm">{format(currentMonth, 'MMMM yyyy')}</span>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={`day-${index}`} className="p-2 font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                {monthDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const isToday = dateStr === todayStr
                  const hasEntry = hasEntryForDate(date)

                  return (
                    <div
                      key={date.toISOString()}
                      className={`
                        p-2 text-sm cursor-pointer rounded transition-colors
                        ${isToday ? 'bg-blue-600 text-white' :
                          hasEntry ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          'hover:bg-gray-100'}
                      `}
                      onClick={() => openEditor(undefined, dateStr)}
                    >
                      {format(date, 'd')}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mood Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smile className="h-5 w-5" />
                <span>How are you feeling?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {moods.map((mood) => (
                  <Button
                    key={mood.label}
                    variant={selectedMood === mood.value ? "default" : "outline"}
                    className="h-16 flex-col space-y-1"
                    onClick={() => saveMood(mood.value)}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-xs">{mood.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Writing Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Writing Prompts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {writingPrompts.slice(0, 4).map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full text-left justify-start text-sm h-auto p-3"
                  onClick={() => openEditor(undefined, todayStr, prompt + '\n\n')}
                >
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingEntry ? 'Edit Entry' : 'Write Entry'} - {format(new Date(selectedDate), 'MMMM d, yyyy')}
                </h2>
                <Button variant="ghost" size="sm" onClick={closeEditor}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="What's on your mind? Start writing..."
                className="min-h-[300px] resize-none"
                autoFocus
              />
            </div>

            <div className="p-6 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {editorContent.length} characters
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveEntry} 
                  disabled={isLoading || !editorContent.trim()}
                >
                  {isLoading ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 