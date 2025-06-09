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
  Briefcase, Calendar, Clock, CheckCircle, AlertCircle, Plus, Users, Target, 
  Search, Filter, Edit3, Trash2, Eye, Timer, DollarSign, FileText,
  PlayCircle, PauseCircle, CheckCircle2, Circle, ArrowRight, Settings
} from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, isThisWeek, startOfWeek, endOfWeek, addDays, isBefore } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WorkTask {
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

interface WorkEvent {
  id: string
  title: string
  description?: string | null
  start_at: string
  end_at: string
  location?: string | null
  created_at: string
}

interface ProjectTask {
  id: string
  title: string
  status: string | null
  due_date?: string | null
  description?: string | null
  created_at: string
  completed_at?: string | null
}

interface WorkProject {
  id: string
  name: string
  description?: string | null
  status: string | null
  created_at: string
  project_tasks?: ProjectTask[]
}

interface WorkPageContentProps {
  user: any
  workTasks: WorkTask[]
  workEvents: WorkEvent[]
  workProjects: WorkProject[]
  categories: any[]
  workCategoryId: string
}

export function WorkPageContent({ 
  user, 
  workTasks: initialTasks, 
  workEvents: initialEvents, 
  workProjects: initialProjects, 
  categories,
  workCategoryId
}: WorkPageContentProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [events, setEvents] = useState(initialEvents)
  const [projects, setProjects] = useState(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'overview' | 'tasks' | 'projects' | 'calendar'>('overview')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isAddingMeeting, setIsAddingMeeting] = useState(false)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null)
  const [editingProject, setEditingProject] = useState<WorkProject | null>(null)
  const [selectedProject, setSelectedProject] = useState<WorkProject | null>(null)
  const [timeTracking, setTimeTracking] = useState<{[key: string]: { start: Date, elapsed: number }}>({})

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    project_id: ''
  })
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    duration: '60',
    location: ''
  })
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'active',
    client: ''
  })

  const supabase = createClient()

  // Computed stats
  const stats = useMemo(() => {
    const pendingTasks = tasks.filter(t => t.status === 'pending')
    const completedTasks = tasks.filter(t => t.status === 'completed')
    const overdueTasks = pendingTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date()
    )
    const activeProjects = projects.filter(p => p.status === 'active')
    const todayMeetings = events.filter(event => 
      isToday(parseISO(event.start_at))
    )

    return {
      activeProjects: activeProjects.length,
      pendingTasks: pendingTasks.length,
      todayMeetings: todayMeetings.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length
    }
  }, [tasks, events, projects])

  // Filtered data
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [tasks, searchQuery])

  const filteredProjects = useMemo(() => {
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [projects, searchQuery])

  // Time tracking functions
  const startTimeTracking = (taskId: string) => {
    setTimeTracking(prev => ({
      ...prev,
      [taskId]: {
        start: new Date(),
        elapsed: prev[taskId]?.elapsed || 0
      }
    }))
    toast.success('Time tracking started')
  }

  const stopTimeTracking = (taskId: string) => {
    setTimeTracking(prev => {
      const tracking = prev[taskId]
      if (!tracking) return prev
      
      const newElapsed = tracking.elapsed + (Date.now() - tracking.start.getTime())
      toast.success(`Tracked ${Math.round(newElapsed / 60000)} minutes`)
      
      return {
        ...prev,
        [taskId]: {
          ...tracking,
          elapsed: newElapsed
        }
      }
    })
  }

  // CRUD Operations
  const addTask = async () => {
    if (!taskForm.title.trim()) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          category_id: workCategoryId,
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      setTasks(prev => [data, ...prev])
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', project_id: '' })
      setIsAddingTask(false)
      toast.success('Task added successfully!')
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
    }
  }

  const updateTask = async (taskId: string, updates: Partial<WorkTask>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ))
      toast.success('Task updated!')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success('Task deleted!')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const completeTask = async (taskId: string) => {
    await updateTask(taskId, { 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
  }

  const addMeeting = async () => {
    if (!meetingForm.title.trim() || !meetingForm.start_date || !meetingForm.start_time) return

    try {
      const startAt = `${meetingForm.start_date}T${meetingForm.start_time}:00`
      const endAt = new Date(new Date(startAt).getTime() + parseInt(meetingForm.duration) * 60000).toISOString()

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          category_id: workCategoryId,
          title: meetingForm.title,
          description: meetingForm.description || null,
          start_at: startAt,
          end_at: endAt,
          location: meetingForm.location || null
        })
        .select()
        .single()

      if (error) throw error

      setEvents(prev => [data, ...prev])
      setMeetingForm({ title: '', description: '', start_date: '', start_time: '', duration: '60', location: '' })
      setIsAddingMeeting(false)
      toast.success('Meeting scheduled!')
    } catch (error) {
      console.error('Error adding meeting:', error)
      toast.error('Failed to schedule meeting')
    }
  }

  const addProject = async () => {
    if (!projectForm.name.trim()) return

    try {
      const description = projectForm.client ? `Client: ${projectForm.client}\n${projectForm.description}` : projectForm.description

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectForm.name,
          description: description || null,
          status: projectForm.status
        })
        .select()
        .single()

      if (error) throw error

      setProjects(prev => [{ ...data, project_tasks: [] }, ...prev])
      setProjectForm({ name: '', description: '', status: 'active', client: '' })
      setIsAddingProject(false)
      toast.success('Project created!')
    } catch (error) {
      console.error('Error adding project:', error)
      toast.error('Failed to create project')
    }
  }

  const updateProject = async (projectId: string, updates: Partial<WorkProject>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.map(project => 
        project.id === projectId ? { ...project, ...updates } : project
      ))
      toast.success('Project updated!')
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) return

    try {
      // Delete project tasks first
      await supabase
        .from('project_tasks')
        .delete()
        .eq('project_id', projectId)

      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.filter(project => project.id !== projectId))
      toast.success('Project deleted!')
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
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

  const getProjectProgress = (project: WorkProject) => {
    const tasks = project.project_tasks || []
    if (tasks.length === 0) return 0
    const completed = tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / tasks.length) * 100)
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

  const formatTimeTracked = (taskId: string) => {
    const tracking = timeTracking[taskId]
    if (!tracking) return '0m'
    
    const totalMs = tracking.elapsed + (tracking.start ? Date.now() - tracking.start.getTime() : 0)
    const minutes = Math.round(totalMs / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Work</h1>
            <p className="text-gray-600">Manage your professional projects, tasks, and meetings</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{stats.pendingTasks} pending</span>
          </Badge>
          {stats.overdueTasks > 0 && (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3" />
              <span>{stats.overdueTasks} overdue</span>
            </Badge>
          )}
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>{stats.activeProjects} active projects</span>
          </Badge>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks, projects, meetings..."
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
            variant={viewMode === 'tasks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tasks')}
          >
            Tasks
          </Button>
          <Button
            variant={viewMode === 'projects' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('projects')}
          >
            Projects
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => setIsAddingTask(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Task
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsAddingMeeting(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Meeting
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsAddingProject(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Project
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.activeProjects}</div>
                <div className="text-sm text-gray-600">Active Projects</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{stats.pendingTasks}</div>
                <div className="text-sm text-gray-600">Pending Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.todayMeetings}</div>
                <div className="text-sm text-gray-600">Today's Meetings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.completedTasks}</div>
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
                <div className="text-2xl font-bold">{stats.overdueTasks}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content based on View Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Tasks Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Current Tasks</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setViewMode('tasks')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
                    isOverdue(task.due_date) ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => completeTask(task.id)}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      {task.priority && (
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-gray-500">
                        Due {format(parseISO(task.due_date), 'MMM d')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {timeTracking[task.id] ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => stopTimeTracking(task.id)}
                        className="text-red-600"
                      >
                        <PauseCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startTimeTracking(task.id)}
                        className="text-green-600"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTask(task)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No work tasks</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* This Week's Meetings */}
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
                  <p className="text-sm">No meetings this week</p>
                </div>
              ) : (
                thisWeekEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
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

      {viewMode === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors hover:bg-gray-50 ${
                  isOverdue(task.due_date) ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full"
                  onClick={() => completeTask(task.id)}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.priority && (
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    )}
                    {isOverdue(task.due_date) && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-gray-600 mb-1">{task.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {task.due_date && (
                      <span>Due {format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
                    )}
                    <span>Created {format(parseISO(task.created_at), 'MMM d')}</span>
                    {timeTracking[task.id] && (
                      <span className="text-blue-600 font-medium">
                        <Timer className="h-3 w-3 inline mr-1" />
                        {formatTimeTracked(task.id)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {timeTracking[task.id] ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stopTimeTracking(task.id)}
                      className="text-red-600"
                    >
                      <PauseCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startTimeTracking(task.id)}
                      className="text-green-600"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTask(task)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTask(task.id)}
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

      {viewMode === 'projects' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{project.name}</h3>
                        <div className="text-xs text-gray-500">
                          {getProjectProgress(project)}% complete
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {project.status}
                    </Badge>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${getProjectProgress(project)}%` }}
                    />
                  </div>

                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    <div>
                      Tasks: {project.project_tasks?.length || 0} total
                    </div>
                    <div>
                      Created {format(parseISO(project.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedProject(project)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProject(project)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
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
            <CardTitle>All Meetings & Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
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

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add New Task</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingTask(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title..."
                />
              </div>

              <div>
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value }))}>
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
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button onClick={addTask}>
                  Add Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {isAddingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Schedule Meeting</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingMeeting(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="meeting-title">Title</Label>
                <Input
                  id="meeting-title"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter meeting title..."
                />
              </div>

              <div>
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea
                  id="meeting-description"
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter meeting description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={meetingForm.start_date}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="meeting-time">Time</Label>
                  <Input
                    id="meeting-time"
                    type="time"
                    value={meetingForm.start_time}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                <Select value={meetingForm.duration} onValueChange={(value) => setMeetingForm(prev => ({ ...prev, duration: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="meeting-location">Location</Label>
                <Input
                  id="meeting-location"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter meeting location..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingMeeting(false)}>
                  Cancel
                </Button>
                <Button onClick={addMeeting}>
                  Schedule Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Project</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingProject(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name..."
                />
              </div>

              <div>
                <Label htmlFor="project-client">Client (Optional)</Label>
                <Input
                  id="project-client"
                  value={projectForm.client}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="Enter client name..."
                />
              </div>

              <div>
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter project description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="project-status">Status</Label>
                <Select value={projectForm.status} onValueChange={(value) => setProjectForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingProject(false)}>
                  Cancel
                </Button>
                <Button onClick={addProject}>
                  Create Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Task</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingTask(null)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-task-title">Title</Label>
                <Input
                  id="edit-task-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter task title..."
                />
              </div>

              <div>
                <Label htmlFor="edit-task-description">Description</Label>
                <Textarea
                  id="edit-task-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter task description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select 
                  value={editingTask.priority || 'medium'} 
                  onValueChange={(value) => setEditingTask(prev => prev ? { ...prev, priority: value } : null)}
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
                <Label htmlFor="edit-task-due-date">Due Date</Label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={editingTask.due_date || ''}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, due_date: e.target.value } : null)}
                />
              </div>

              <div>
                <Label htmlFor="edit-task-status">Status</Label>
                <Select 
                  value={editingTask.status || 'pending'} 
                  onValueChange={(value) => setEditingTask(prev => prev ? { ...prev, status: value } : null)}
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

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (editingTask) {
                      await updateTask(editingTask.id, {
                        title: editingTask.title,
                        description: editingTask.description,
                        priority: editingTask.priority,
                        due_date: editingTask.due_date,
                        status: editingTask.status
                      })
                      setEditingTask(null)
                    }
                  }}
                >
                  Update Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Project</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingProject(null)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-project-name">Project Name</Label>
                <Input
                  id="edit-project-name"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Enter project name..."
                />
              </div>

              <div>
                <Label htmlFor="edit-project-description">Description</Label>
                <Textarea
                  id="edit-project-description"
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter project description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-project-status">Status</Label>
                <Select 
                  value={editingProject.status || 'active'} 
                  onValueChange={(value) => setEditingProject(prev => prev ? { ...prev, status: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingProject(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (editingProject) {
                      await updateProject(editingProject.id, {
                        name: editingProject.name,
                        description: editingProject.description,
                        status: editingProject.status
                      })
                      setEditingProject(null)
                    }
                  }}
                >
                  Update Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary">
                    {selectedProject.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {getProjectProgress(selectedProject)}% complete
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>
                ×
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Project Info */}
              <div className="lg:col-span-2 space-y-6">
                {selectedProject.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-600 text-sm">{selectedProject.description}</p>
                  </div>
                )}

                {/* Project Tasks */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Project Tasks</h3>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {selectedProject.project_tasks && selectedProject.project_tasks.length > 0 ? (
                      selectedProject.project_tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <div className="h-4 w-4 rounded border flex items-center justify-center">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <Circle className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.due_date && (
                              <p className="text-xs text-gray-500">
                                Due {format(parseISO(task.due_date), 'MMM d')}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={task.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {task.status || 'pending'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No tasks yet</p>
                        <p className="text-xs">Add tasks to track project progress</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Stats Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${getProjectProgress(selectedProject)}%` }}
                      />
                    </div>
                    <div className="text-center text-sm font-medium">
                      {getProjectProgress(selectedProject)}% Complete
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tasks</span>
                      <span className="font-medium">{selectedProject.project_tasks?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium text-green-600">
                        {selectedProject.project_tasks?.filter(t => t.status === 'completed').length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-medium text-orange-600">
                        {selectedProject.project_tasks?.filter(t => t.status !== 'completed').length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">
                        {format(parseISO(selectedProject.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setSelectedProject(null)
                      setEditingProject(selectedProject)
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedProject(null)}
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