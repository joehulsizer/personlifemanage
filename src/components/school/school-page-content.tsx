'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  GraduationCap, Calendar, BookOpen, Clock, AlertCircle, CheckCircle, Plus, 
  Search, Edit3, Trash2, Eye, Trophy, Target, Users, Star,
  CheckCircle2, Circle, ArrowRight, Calculator, FileText, Brain
} from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, isThisWeek, addDays, isBefore, startOfWeek, endOfWeek } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Assignment {
  id: string
  title: string
  description?: string | null
  status: string | null
  priority: string | null
  due_date?: string | null
  created_at: string
  completed_at?: string | null
  categories?: {
    name: string
    icon: string | null
    color: string | null
  } | null
}

interface SchoolEvent {
  id: string
  title: string
  description?: string | null
  start_at: string
  end_at: string
  location?: string | null
  created_at: string
}

interface Course {
  name: string
  assignments: Assignment[]
  pendingCount: number
  completedCount: number
  totalCount: number
  completionRate: number
  averageGrade?: number
  instructor?: string
  credits?: number
}

interface SchoolPageContentProps {
  user: any
  assignments: Assignment[]
  schoolEvents: SchoolEvent[]
  categories: any[]
  schoolCategoryId: string
}

export function SchoolPageContent({ 
  user, 
  assignments: initialAssignments, 
  schoolEvents: initialEvents, 
  categories,
  schoolCategoryId
}: SchoolPageContentProps) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [events, setEvents] = useState(initialEvents)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'overview' | 'assignments' | 'courses' | 'calendar' | 'grades'>('overview')
  const [isAddingAssignment, setIsAddingAssignment] = useState(false)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [isAddingCourse, setIsAddingCourse] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    course: '',
    priority: 'medium',
    due_date: '',
    type: 'assignment',
    grade: '',
    maxGrade: '100'
  })
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    course: '',
    start_date: '',
    start_time: '',
    duration: '60',
    location: '',
    type: 'lecture'
  })
  const [courseForm, setCourseForm] = useState({
    name: '',
    instructor: '',
    credits: '3',
    semester: '',
    code: ''
  })

  const supabase = createClient()

  // Process courses from assignments
  const courses = useMemo(() => {
    const courseMap = new Map<string, Course>()
    
    assignments.forEach(assignment => {
      const courseName = assignment.description?.split(':')[0]?.trim() || 'Uncategorized'
      
      if (!courseMap.has(courseName)) {
        courseMap.set(courseName, {
          name: courseName,
          assignments: [],
          pendingCount: 0,
          completedCount: 0,
          totalCount: 0,
          completionRate: 0,
          averageGrade: 0
        })
      }
      
      const course = courseMap.get(courseName)!
      course.assignments.push(assignment)
      course.totalCount++
      
      if (assignment.status === 'completed') {
        course.completedCount++
      } else {
        course.pendingCount++
      }
    })
    
    // Calculate completion rates
    courseMap.forEach(course => {
      course.completionRate = course.totalCount > 0 
        ? Math.round((course.completedCount / course.totalCount) * 100) 
        : 0
    })
    
    return Array.from(courseMap.values()).sort((a, b) => b.totalCount - a.totalCount)
  }, [assignments])

  // Computed stats
  const stats = useMemo(() => {
    const pendingAssignments = assignments.filter(a => a.status === 'pending')
    const completedAssignments = assignments.filter(a => a.status === 'completed')
    const overdueAssignments = pendingAssignments.filter(a => 
      a.due_date && new Date(a.due_date) < new Date()
    )
    
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    const thisWeekEvents = events.filter(event => {
      const eventDate = new Date(event.start_at)
      return eventDate >= weekStart && eventDate <= weekEnd
    })

    const overallGPA = courses.length > 0 
      ? courses.reduce((sum, course) => sum + (course.averageGrade || 0), 0) / courses.length 
      : 0

    return {
      totalCourses: courses.length,
      pendingAssignments: pendingAssignments.length,
      completedAssignments: completedAssignments.length,
      overdueAssignments: overdueAssignments.length,
      thisWeekEvents: thisWeekEvents.length,
      overallGPA: overallGPA
    }
  }, [assignments, events, courses])

  // Filtered data
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => 
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [assignments, searchQuery])

  const filteredCourses = useMemo(() => {
    return courses.filter(course => 
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [courses, searchQuery])

  // CRUD Operations
  const addAssignment = async () => {
    if (!assignmentForm.title.trim()) return

    try {
      const description = assignmentForm.course 
        ? `${assignmentForm.course}: ${assignmentForm.description}`
        : assignmentForm.description

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          category_id: schoolCategoryId,
          title: assignmentForm.title,
          description: description || null,
          priority: assignmentForm.priority,
          due_date: assignmentForm.due_date || null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      setAssignments(prev => [data, ...prev])
      setAssignmentForm({ 
        title: '', description: '', course: '', priority: 'medium', 
        due_date: '', type: 'assignment', grade: '', maxGrade: '100' 
      })
      setIsAddingAssignment(false)
      toast.success('Assignment added successfully!')
    } catch (error) {
      console.error('Error adding assignment:', error)
      toast.error('Failed to add assignment')
    }
  }

  const updateAssignment = async (assignmentId: string, updates: Partial<Assignment>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', assignmentId)

      if (error) throw error

      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId ? { ...assignment, ...updates } : assignment
      ))
      toast.success('Assignment updated!')
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast.error('Failed to update assignment')
    }
  }

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId))
      toast.success('Assignment deleted!')
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Failed to delete assignment')
    }
  }

  const completeAssignment = async (assignmentId: string) => {
    await updateAssignment(assignmentId, { 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
  }

  const addEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.start_date || !eventForm.start_time) return

    try {
      const startAt = `${eventForm.start_date}T${eventForm.start_time}:00`
      const endAt = new Date(new Date(startAt).getTime() + parseInt(eventForm.duration) * 60000).toISOString()
      
      const description = eventForm.course 
        ? `${eventForm.course}: ${eventForm.description}`
        : eventForm.description

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          category_id: schoolCategoryId,
          title: eventForm.title,
          description: description || null,
          start_at: startAt,
          end_at: endAt,
          location: eventForm.location || null
        })
        .select()
        .single()

      if (error) throw error

      setEvents(prev => [data, ...prev])
      setEventForm({ 
        title: '', description: '', course: '', start_date: '', 
        start_time: '', duration: '60', location: '', type: 'lecture' 
      })
      setIsAddingEvent(false)
      toast.success('Event scheduled!')
    } catch (error) {
      console.error('Error adding event:', error)
      toast.error('Failed to schedule event')
    }
  }

  // Get this week's events
  const thisWeekEvents = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    return events.filter(event => {
      const eventDate = new Date(event.start_at)
      return eventDate >= weekStart && eventDate <= weekEnd
    })
  }, [events])

  const formatEventTime = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      if (isToday(date)) {
        return `Today, ${format(date, 'h:mm a')}`
      }
      if (isTomorrow(date)) {
        return `Tomorrow, ${format(date, 'h:mm a')}`
      }
      if (isThisWeek(date)) {
        return format(date, 'EEEE, h:mm a')
      }
      return format(date, 'MMM d, h:mm a')
    } catch {
      return 'Invalid date'
    }
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'secondary'
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return isBefore(parseISO(dueDate), new Date())
  }

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">School</h1>
            <p className="text-gray-600">Manage your courses, assignments, and academic schedule</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{stats.pendingAssignments} pending</span>
          </Badge>
          {stats.overdueAssignments > 0 && (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3" />
              <span>{stats.overdueAssignments} overdue</span>
            </Badge>
          )}
          <Badge variant="secondary" className="flex items-center space-x-1">
            <BookOpen className="h-3 w-3" />
            <span>{stats.totalCourses} courses</span>
          </Badge>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search assignments, courses, events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            Overview
          </Button>
          <Button
            variant={viewMode === 'assignments' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('assignments')}
          >
            Assignments
          </Button>
          <Button
            variant={viewMode === 'courses' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('courses')}
          >
            Courses
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </Button>
          <Button
            variant={viewMode === 'grades' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grades')}
          >
            Grades
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => setIsAddingAssignment(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Assignment
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsAddingEvent(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Event
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsAddingCourse(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Course
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <div className="text-sm text-gray-600">Courses</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{stats.pendingAssignments}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.completedAssignments}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{stats.overdueAssignments}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.thisWeekEvents}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.overallGPA.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Avg Grade</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content based on View Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Assignments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Current Assignments</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setViewMode('assignments')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredAssignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
                    isOverdue(assignment.due_date) ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => completeAssignment(assignment.id)}
                  >
                    {assignment.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm truncate">{assignment.title}</p>
                      {assignment.priority && (
                        <Badge variant={getPriorityColor(assignment.priority)} className="text-xs">
                          {assignment.priority}
                        </Badge>
                      )}
                      {isOverdue(assignment.due_date) && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {assignment.due_date && (
                      <p className="text-xs text-gray-500">
                        Due {format(parseISO(assignment.due_date), 'MMM d')}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingAssignment(assignment)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {filteredAssignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No assignments</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* This Week's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>This Week</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setViewMode('calendar')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {thisWeekEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No events this week</p>
                </div>
              ) : (
                thisWeekEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-gray-500">
                        {formatEventTime(event.start_at)}
                      </div>
                      {event.location && (
                        <div className="text-xs text-gray-500 mt-1">
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                    {isToday(parseISO(event.start_at)) && (
                      <Badge variant="secondary" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'assignments' && (
        <Card>
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors hover:bg-gray-50 ${
                  isOverdue(assignment.due_date) ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full"
                  onClick={() => completeAssignment(assignment.id)}
                >
                  {assignment.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-sm">{assignment.title}</p>
                    {assignment.priority && (
                      <Badge variant={getPriorityColor(assignment.priority)} className="text-xs">
                        {assignment.priority}
                      </Badge>
                    )}
                    {isOverdue(assignment.due_date) && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  
                  {assignment.description && (
                    <p className="text-xs text-gray-600 mb-1">{assignment.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {assignment.due_date && (
                      <span>Due {format(parseISO(assignment.due_date), 'MMM d, yyyy')}</span>
                    )}
                    <span>Created {format(parseISO(assignment.created_at), 'MMM d')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingAssignment(assignment)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAssignment(assignment.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {viewMode === 'courses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <Card key={course.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{course.name}</h3>
                        <div className="text-xs text-gray-500">
                          {course.totalCount} assignments
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getProgressColor(course.completionRate)}`}
                    >
                      {course.completionRate}%
                    </Badge>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${course.completionRate}%` }}
                    />
                  </div>

                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{course.pendingCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium text-green-600">{course.completedCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>All Events & Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{event.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatEventTime(event.start_at)} - {format(parseISO(event.end_at), 'h:mm a')}
                  </div>
                  {event.location && (
                    <div className="text-xs text-gray-500 mt-1">
                      📍 {event.location}
                    </div>
                  )}
                  {event.description && (
                    <div className="text-xs text-gray-600 mt-1">{event.description}</div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {isToday(parseISO(event.start_at)) && (
                    <Badge variant="secondary" className="text-xs">
                      Today
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {viewMode === 'grades' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Grade Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{course.name}</div>
                      <div className="text-xs text-gray-500">
                        {course.completedCount} of {course.totalCount} completed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {course.averageGrade ? `${course.averageGrade.toFixed(1)}%` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Grade</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Academic Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.overallGPA.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Overall Average</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Assignments</span>
                    <span className="font-medium">{assignments.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span className="font-medium text-green-600">{stats.completedAssignments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-medium text-orange-600">{stats.pendingAssignments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overdue</span>
                    <span className="font-medium text-red-600">{stats.overdueAssignments}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Assignment Modal */}
      {isAddingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add New Assignment</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingAssignment(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="assignment-title">Title</Label>
                <Input
                  id="assignment-title"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter assignment title..."
                />
              </div>

              <div>
                <Label htmlFor="assignment-course">Course</Label>
                <Input
                  id="assignment-course"
                  value={assignmentForm.course}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="Enter course name..."
                />
              </div>

              <div>
                <Label htmlFor="assignment-description">Description</Label>
                <Textarea
                  id="assignment-description"
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter assignment description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignment-priority">Priority</Label>
                  <Select 
                    value={assignmentForm.priority} 
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignment-type">Type</Label>
                  <Select 
                    value={assignmentForm.type} 
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="homework">Homework</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="assignment-due-date">Due Date</Label>
                <Input
                  id="assignment-due-date"
                  type="date"
                  value={assignmentForm.due_date}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingAssignment(false)}>
                  Cancel
                </Button>
                <Button onClick={addAssignment}>
                  Add Assignment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Schedule Event</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingEvent(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title..."
                />
              </div>

              <div>
                <Label htmlFor="event-course">Course (Optional)</Label>
                <Input
                  id="event-course"
                  value={eventForm.course}
                  onChange={(e) => setEventForm(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="Enter course name..."
                />
              </div>

              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select 
                  value={eventForm.type} 
                  onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="office-hours">Office Hours</SelectItem>
                    <SelectItem value="study-group">Study Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="event-time">Time</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="event-duration">Duration (minutes)</Label>
                <Select 
                  value={eventForm.duration} 
                  onValueChange={(value) => setEventForm(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location (classroom, building, etc.)..."
                />
              </div>

              <div>
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingEvent(false)}>
                  Cancel
                </Button>
                <Button onClick={addEvent}>
                  Schedule Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Assignment</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingAssignment(null)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-assignment-title">Title</Label>
                <Input
                  id="edit-assignment-title"
                  value={editingAssignment.title}
                  onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter assignment title..."
                />
              </div>

              <div>
                <Label htmlFor="edit-assignment-description">Description</Label>
                <Textarea
                  id="edit-assignment-description"
                  value={editingAssignment.description || ''}
                  onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter assignment description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-assignment-priority">Priority</Label>
                  <Select 
                    value={editingAssignment.priority || 'medium'} 
                    onValueChange={(value) => setEditingAssignment(prev => prev ? { ...prev, priority: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-assignment-status">Status</Label>
                  <Select 
                    value={editingAssignment.status || 'pending'} 
                    onValueChange={(value) => setEditingAssignment(prev => prev ? { ...prev, status: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-assignment-due-date">Due Date</Label>
                <Input
                  id="edit-assignment-due-date"
                  type="date"
                  value={editingAssignment.due_date || ''}
                  onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, due_date: e.target.value } : null)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingAssignment(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (editingAssignment) {
                      await updateAssignment(editingAssignment.id, {
                        title: editingAssignment.title,
                        description: editingAssignment.description,
                        priority: editingAssignment.priority,
                        due_date: editingAssignment.due_date,
                        status: editingAssignment.status
                      })
                      setEditingAssignment(null)
                    }
                  }}
                >
                  Update Assignment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedCourse.name}</h2>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge 
                    variant="secondary" 
                    className={getProgressColor(selectedCourse.completionRate)}
                  >
                    {selectedCourse.completionRate}% Complete
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {selectedCourse.totalCount} total assignments
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)}>
                ×
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course Assignments */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Course Assignments</h3>
                    <Button size="sm" onClick={() => setIsAddingAssignment(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Assignment
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {selectedCourse.assignments.length > 0 ? (
                      selectedCourse.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 ${
                            isOverdue(assignment.due_date) ? 'border-red-200 bg-red-50' : ''
                          }`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full"
                            onClick={() => completeAssignment(assignment.id)}
                          >
                            {assignment.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium">{assignment.title}</p>
                              {assignment.priority && (
                                <Badge variant={getPriorityColor(assignment.priority)} className="text-xs">
                                  {assignment.priority}
                                </Badge>
                              )}
                              {isOverdue(assignment.due_date) && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            {assignment.due_date && (
                              <p className="text-xs text-gray-500">
                                Due {format(parseISO(assignment.due_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAssignment(assignment)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No assignments yet</p>
                        <p className="text-xs">Add assignments to track your progress</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Course Stats Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Course Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${selectedCourse.completionRate}%` }}
                      />
                    </div>
                    <div className="text-center text-sm font-medium">
                      {selectedCourse.completionRate}% Complete
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Assignments</span>
                      <span className="font-medium">{selectedCourse.totalCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium text-green-600">{selectedCourse.completedCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending</span>
                      <span className="font-medium text-orange-600">{selectedCourse.pendingCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Average Grade</span>
                      <span className="font-medium">
                        {selectedCourse.averageGrade ? `${selectedCourse.averageGrade.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Course Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedCourse.instructor && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Instructor</span>
                        <span className="font-medium">{selectedCourse.instructor}</span>
                      </div>
                    )}
                    {selectedCourse.credits && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Credits</span>
                        <span className="font-medium">{selectedCourse.credits}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => setSelectedCourse(null)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Study Mode
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedCourse(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}