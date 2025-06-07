'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Search, Tag, Calendar, Edit, X, Save, Trash2, Grid, List, Eye, MoreVertical } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Note {
  id: string
  title: string | null
  content_md: string | null
  created_at: string
  updated_at: string
  user_id: string
  category_id: string
}

interface NotesPageContentProps {
  user: any
  notes: Note[]
  categories: any[]
  notesCategoryId: string
}

const noteTemplates = [
  {
    name: 'Meeting Notes',
    icon: FileText,
    template: `# Meeting Notes - ${format(new Date(), 'MMM d, yyyy')}

## Attendees
- 

## Agenda
- 

## Discussion Points
- 

## Action Items
- [ ] 

## Next Steps
- 
`
  },
  {
    name: 'Daily Journal',
    icon: Edit,
    template: `# Daily Journal - ${format(new Date(), 'EEEE, MMMM d, yyyy')}

## How I'm Feeling
> 

## What Happened Today
- 

## Wins & Accomplishments
- 

## Challenges
- 

## Tomorrow's Focus
- 
`
  },
  {
    name: 'Ideas',
    icon: Tag,
    template: `# Ideas & Brainstorming

## The Idea
> 

## Why This Matters
- 

## Potential Solutions
- 

## Next Steps
- [ ] 

## Resources & Links
- 
`
  },
  {
    name: 'Project Notes',
    icon: Calendar,
    template: `# Project: [Project Name]

## Overview
> 

## Goals
- 

## Current Status
- 

## Tasks
- [ ] 
- [ ] 
- [ ] 

## Notes & Updates
- 

## Resources
- 
`
  }
]

export function NotesPageContent({ user, notes: initialNotes, categories, notesCategoryId }: NotesPageContentProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editorTitle, setEditorTitle] = useState('')
  const [editorContent, setEditorContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes

    const query = searchQuery.toLowerCase()
    return notes.filter(note => 
      (note.title?.toLowerCase().includes(query)) ||
      (note.content_md?.toLowerCase().includes(query))
    )
  }, [notes, searchQuery])

  const extractTitle = (content: string | null, title: string | null) => {
    if (title) return title
    
    if (!content) return 'Untitled Note'
    
    const lines = content.split('\n')
    const firstLine = lines[0]?.trim()

    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '')
    }

    return firstLine || 'Untitled Note'
  }

  const truncateContent = (content: string | null, maxLength = 150) => {
    if (!content) return ''
    
    // Remove markdown headers for preview
    const cleanContent = content.replace(/^#+\s*.*\n?/gm, '').trim()
    
    if (cleanContent.length <= maxLength) return cleanContent
    return cleanContent.substring(0, maxLength) + '...'
  }

  const openEditor = (note?: Note, template?: string) => {
    if (note) {
      setEditingNote(note)
      setEditorTitle(note.title || '')
      setEditorContent(note.content_md || '')
    } else {
      setEditingNote(null)
      setEditorTitle('')
      setEditorContent(template || '')
    }
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditingNote(null)
    setEditorTitle('')
    setEditorContent('')
  }

  const saveNote = async () => {
    if (!editorContent.trim()) {
      toast.error('Please write something before saving!')
      return
    }

    setIsLoading(true)
    try {
      const noteData = {
        user_id: user.id,
        category_id: notesCategoryId,
        title: editorTitle.trim() || null,
        content_md: editorContent,
        updated_at: new Date().toISOString()
      }

      let result
      if (editingNote) {
        // Update existing note
        result = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', editingNote.id)
          .select()
          .single()
      } else {
        // Create new note
        result = await supabase
          .from('notes')
          .insert({
            ...noteData,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      if (result.error) throw result.error

      // Update local state
      const updatedNote = result.data
      setNotes(prev => {
        const filtered = prev.filter(n => n.id !== updatedNote.id)
        return [updatedNote, ...filtered]
      })

      toast.success(editingNote ? 'Note updated!' : 'Note saved!')
      closeEditor()
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      setNotes(prev => prev.filter(n => n.id !== noteId))
      toast.success('Note deleted!')
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
        setShowPreview(false)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Failed to delete note')
    }
  }

  const openNote = (note: Note) => {
    setSelectedNote(note)
    setShowPreview(true)
  }

  const recentNotes = filteredNotes.slice(0, 6)
  const totalNotes = notes.length

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
            <p className="text-gray-600">Capture and organize your thoughts</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <FileText className="h-3 w-3" />
            <span>{totalNotes} notes</span>
          </Badge>
          <Button 
            size="sm" 
            className="flex items-center space-x-1"
            onClick={() => openEditor()}
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search notes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{totalNotes}</div>
                <div className="text-sm text-gray-600">Total Notes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{recentNotes.length}</div>
                <div className="text-sm text-gray-600">Recent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{filteredNotes.length}</div>
                <div className="text-sm text-gray-600">Found</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{format(new Date(), 'd')}</div>
                <div className="text-sm text-gray-600">Day of Month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Note Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Quick Note Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {noteTemplates.map((template) => (
              <Button 
                key={template.name}
                variant="outline" 
                className="h-20 flex-col space-y-1"
                onClick={() => openEditor(undefined, template.template)}
              >
                <template.icon className="h-6 w-6" />
                <span className="text-sm">{template.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes Display */}
      {filteredNotes.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {searchQuery ? `Search Results (${filteredNotes.length})` : 'All Notes'}
            </h2>
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Search
              </Button>
            )}
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 
                        className="font-semibold text-lg line-clamp-1 flex-1 cursor-pointer"
                        onClick={() => openNote(note)}
                      >
                        {extractTitle(note.content_md, note.title)}
                      </h3>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => openNote(note)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => openEditor(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p 
                      className="text-gray-600 text-sm mb-4 line-clamp-4 cursor-pointer"
                      onClick={() => openNote(note)}
                    >
                      {truncateContent(note.content_md)}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {format(parseISO(note.updated_at), 'MMM d, yyyy · h:mm a')}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Markdown
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => openNote(note)}
                      >
                        <h3 className="font-medium mb-1">
                          {extractTitle(note.content_md, note.title)}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {truncateContent(note.content_md)}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                          {format(parseISO(note.updated_at), 'MMM d, yyyy · h:mm a')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => openNote(note)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => openEditor(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? `Try searching for something else or create a new note.`
                : 'Start capturing your thoughts and ideas.'
              }
            </p>
            <Button 
              className="flex items-center space-x-2"
              onClick={() => openEditor()}
            >
              <Plus className="h-4 w-4" />
              <span>{searchQuery ? 'Create New Note' : 'Create Your First Note'}</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Note Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingNote ? 'Edit Note' : 'Create New Note'}
                </h2>
                <Button variant="ghost" size="sm" onClick={closeEditor}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <Input
                placeholder="Note title (optional)"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="text-lg font-medium"
              />
              
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Start writing your note... (Markdown supported)"
                className="min-h-[400px] resize-none font-mono"
                autoFocus
              />
            </div>

            <div className="p-6 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {editorContent.length} characters • Markdown supported
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveNote} 
                  disabled={isLoading || !editorContent.trim()}
                >
                  {isLoading ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save Note
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Preview Modal */}
      {showPreview && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {extractTitle(selectedNote.content_md, selectedNote.title)}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditor(selectedNote)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPreview(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Last updated {format(parseISO(selectedNote.updated_at), 'MMMM d, yyyy · h:mm a')}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                  {selectedNote.content_md}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 