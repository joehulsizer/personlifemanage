'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  FolderOpen, Plus, Target, Clock, CheckCircle, Users, Calendar, 
  Search, Filter, Grid3X3, List, Play, Pause, MoreHorizontal,
  Edit, Trash2, Eye, PlusCircle, Timer, BarChart3, Star,
  Kanban, Settings, Archive, Download, Upload
} from 'lucide-react'
import { format, parseISO, isAfter, isBefore } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface ProjectTask {
  id: string
  title: string
  description?: string | null
  status: string | null
  due_date?: string | null
  created_at: string
  completed_at?: string | null
  updated_at: string
}

interface Project {
  id: string
  name: string
  description?: string | null
  status: string | null
  created_at: string
  updated_at: string
  project_tasks?: ProjectTask[]
}

interface ProjectsPageContentProps {
  user: any
  projects: Project[]
}

export function ProjectsPageContent({ user, projects: initialProjects }: ProjectsPageContentProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'overview' | 'kanban' | 'list' | 'analytics'>('overview')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null)
  
  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'active'
  })
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    due_date: '',
    project_id: ''
  })

  // Time tracking
  const [timeTracker, setTimeTracker] = useState<Record<string, { start: Date, elapsed: number }>>({})

  const supabase = createClient()

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [projects, searchQuery, statusFilter])

  const getProjectStats = (project: Project) => {
    const tasks = project.project_tasks || []
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
    const todoTasks = tasks.filter(t => t.status === 'todo').length
    const overdueTasks = tasks.filter(t => 
      t.due_date && 
      t.status !== 'completed' && 
      isAfter(new Date(), parseISO(t.due_date))
    ).length
    
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      progress
    }
  }

  const addProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectForm.name,
          description: projectForm.description || null,
          status: projectForm.status,
          user_id: user.id
        })
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
        .single()

      if (error) throw error

      setProjects(prev => [data, ...prev])
      setProjectForm({ name: '', description: '', status: 'active' })
      setShowCreateModal(false)
      toast.success('Project created successfully!')
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    }
  }

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      ))
      toast.success('Project updated successfully!')
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.filter(p => p.id !== projectId))
      toast.success('Project deleted successfully!')
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  const addTask = async () => {
    if (!taskForm.title.trim() || !taskForm.project_id) {
      toast.error('Task title and project are required')
      return
    }

    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          title: taskForm.title,
          description: taskForm.description || null,
          status: taskForm.status,
          due_date: taskForm.due_date || null,
          project_id: taskForm.project_id
        })
        .select()
        .single()

      if (error) throw error

      setProjects(prev => prev.map(p => 
        p.id === taskForm.project_id 
          ? { ...p, project_tasks: [...(p.project_tasks || []), data] }
          : p
      ))

      setTaskForm({ title: '', description: '', status: 'todo', due_date: '', project_id: '' })
      setShowTaskModal(false)
      toast.success('Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const updateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({
          ...updates,
          completed_at: updates.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error

      setProjects(prev => prev.map(p => ({
        ...p,
        project_tasks: p.project_tasks?.map(t => 
          t.id === taskId ? { ...t, ...updates } : t
        )
      })))

      toast.success('Task updated successfully!')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setProjects(prev => prev.map(p => ({
        ...p,
        project_tasks: p.project_tasks?.filter(t => t.id !== taskId)
      })))

      toast.success('Task deleted successfully!')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const startTimeTracking = (taskId: string) => {
    setTimeTracker(prev => ({
      ...prev,
      [taskId]: {
        start: new Date(),
        elapsed: prev[taskId]?.elapsed || 0
      }
    }))
  }

  const stopTimeTracking = (taskId: string) => {
    setTimeTracker(prev => {
      if (prev[taskId]) {
        const elapsed = prev[taskId].elapsed + (Date.now() - prev[taskId].start.getTime())
        return {
          ...prev,
          [taskId]: {
            ...prev[taskId],
            elapsed
          }
        }
      }
      return prev
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (dueDate: string | null) => {
    return dueDate && isAfter(new Date(), parseISO(dueDate))
  }

  const formatTimeTracked = (taskId: string) => {
    const tracker = timeTracker[taskId]
    if (!tracker) return '0m'
    
    const totalMs = tracker.elapsed + (tracker.start ? Date.now() - tracker.start.getTime() : 0)
    const minutes = Math.floor(totalMs / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const openProject = (project: Project) => {
    setSelectedProject(project)
    setShowProjectModal(true)
  }

  const openCreateTask = (projectId: string) => {
    setTaskForm(prev => ({ ...prev, project_id: projectId }))
    setShowTaskModal(true)
  }

  const ProjectTemplates = [
    { name: 'Web Development', description: 'Frontend and backend development project', tasks: ['Setup environment', 'Design mockups', 'Develop frontend', 'Develop backend', 'Testing', 'Deployment'] },
    { name: 'Marketing Campaign', description: 'Complete marketing campaign management', tasks: ['Research target audience', 'Create content', 'Design materials', 'Launch campaign', 'Monitor results', 'Analyze performance'] },
    { name: 'Product Launch', description: 'New product development and launch', tasks: ['Market research', 'Product design', 'Development', 'Testing', 'Marketing materials', 'Launch event'] },
    { name: 'Event Planning', description: 'Event organization and management', tasks: ['Venue booking', 'Catering', 'Invitations', 'Entertainment', 'Setup', 'Event execution'] }
  ]

  const applyTemplate = (template: typeof ProjectTemplates[0]) => {
    setProjectForm(prev => ({
      ...prev,
      name: template.name,
      description: template.description
    }))
  }

  // Kanban board drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    
    if (source.droppableId === destination.droppableId) return

    updateTask(draggableId, { status: destination.droppableId })
  }

  const overallStats = useMemo(() => {
    const allTasks = projects.flatMap(p => p.project_tasks || [])
    const activeProjects = projects.filter(p => p.status === 'active')
    const completedProjects = projects.filter(p => p.status === 'completed')
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'completed').length
    
    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  }, [projects])

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your projects and track progress</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{overallStats.totalProjects}</div>
                <div className="text-sm text-gray-600">Total Projects</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{overallStats.activeProjects}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{overallStats.completedProjects}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{overallStats.totalTasks}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">{overallStats.completionRate}%</div>
                <div className="text-sm text-gray-600">Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center space-x-1">
            <Grid3X3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center space-x-1">
            <Kanban className="h-4 w-4" />
            <span>Kanban</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center space-x-1">
            <List className="h-4 w-4" />
            <span>List</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const stats = getProjectStats(project)
                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className="text-sm text-gray-500">
                              Created {format(parseISO(project.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getStatusColor(project.status || '')}`}>
                            {(project.status || '').replace('_', ' ')}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => openProject(project)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCreateTask(project.id)}>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Task
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteProject(project.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                      )}

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{stats.progress}%</span>
                        </div>

                        <Progress value={stats.progress} className="h-2" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-gray-600">Done: {stats.completedTasks}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-gray-600">Pending: {stats.totalTasks - stats.completedTasks}</span>
                          </div>
                        </div>

                        {stats.overdueTasks > 0 && (
                          <div className="flex items-center space-x-1 text-sm text-red-600">
                            <Clock className="h-4 w-4" />
                            <span>{stats.overdueTasks} overdue tasks</span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openProject(project)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Open Project
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openCreateTask(project.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters.' 
                    : 'Create your first project to get started organizing your work.'}
                </p>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Kanban Tab */}
        <TabsContent value="kanban">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['todo', 'in_progress', 'completed', 'blocked'].map((status) => (
                <Card key={status}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getTaskStatusColor(status).split(' ')[0]}`} />
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {filteredProjects.flatMap(p => p.project_tasks || []).filter(t => t.status === status).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId={status}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 min-h-[200px]"
                        >
                          {filteredProjects.flatMap(project => 
                            (project.project_tasks || [])
                              .filter(task => task.status === status)
                              .map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="p-3 cursor-move hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-sm">{task.title}</h4>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => deleteTask(task.id)}>
                                              <Trash2 className="h-3 w-3 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>

                                      {task.description && (
                                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}

                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{project.name}</span>
                                        {task.due_date && (
                                          <span className={isOverdue(task.due_date) ? 'text-red-600' : ''}>
                                            {format(parseISO(task.due_date), 'MMM d')}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between mt-2">
                                        {timeTracker[task.id] ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => stopTimeTracking(task.id)}
                                            className="text-xs h-6"
                                          >
                                            <Pause className="h-3 w-3 mr-1" />
                                            {formatTimeTracked(task.id)}
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => startTimeTracking(task.id)}
                                            className="text-xs h-6"
                                          >
                                            <Play className="h-3 w-3 mr-1" />
                                            Start
                                          </Button>
                                        )}
                                      </div>
                                    </Card>
                                  )}
                                </Draggable>
                              ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DragDropContext>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const stats = getProjectStats(project)
                  return (
                    <div key={project.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                      <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-purple-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium truncate">{project.name}</h3>
                          <Badge className={`text-xs ${getStatusColor(project.status || '')}`}>
                            {(project.status || '').replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>{stats.progress}% complete</span>
                          <span>{stats.totalTasks} tasks</span>
                          <span>Updated {format(parseISO(project.updated_at), 'MMM d')}</span>
                          {stats.overdueTasks > 0 && (
                            <span className="text-red-600">{stats.overdueTasks} overdue</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${stats.progress}%` }}
                          />
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openProject(project)}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['active', 'completed', 'on_hold', 'archived'].map((status) => {
                    const count = projects.filter(p => p.status === status).length
                    const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="capitalize">{status.replace('_', ' ')}</span>
                          <span>{count} ({Math.round(percentage)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Completion Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600">{overallStats.completionRate}%</div>
                    <div className="text-gray-600">Overall Completion Rate</div>
                  </div>
                  <Progress value={overallStats.completionRate} className="h-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{overallStats.completedTasks}</div>
                      <div className="text-gray-600">Completed Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{overallStats.totalTasks - overallStats.completedTasks}</div>
                      <div className="text-gray-600">Remaining Tasks</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Project Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredProjects.slice(0, 5).map((project) => {
                    const stats = getProjectStats(project)
                    return (
                      <div key={project.id} className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-sm text-gray-600">{stats.progress}%</span>
                          </div>
                          <Progress value={stats.progress} className="h-2" />
                        </div>
                        <div className="text-sm text-gray-600 min-w-0">
                          {stats.completedTasks}/{stats.totalTasks} tasks
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new project to organize your work and track progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Project Templates */}
            <div>
              <Label className="text-sm font-medium">Quick Templates</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ProjectTemplates.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="justify-start text-left h-auto p-3"
                  >
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={projectForm.name}
                onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name..."
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={projectForm.description}
                onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Project description..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={projectForm.status} onValueChange={(value) => setProjectForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={addProject}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Details Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5" />
                  <span>{selectedProject.name}</span>
                  <Badge className={`text-xs ${getStatusColor(selectedProject.status || '')}`}>
                    {(selectedProject.status || '').replace('_', ' ')}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Created on {format(parseISO(selectedProject.created_at), 'MMMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {selectedProject.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-gray-600 mt-1">{selectedProject.description}</p>
                  </div>
                )}

                {/* Project Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const stats = getProjectStats(selectedProject)
                    return (
                      <>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{stats.progress}%</div>
                          <div className="text-sm text-gray-600">Complete</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                          <div className="text-sm text-gray-600">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{stats.totalTasks - stats.completedTasks}</div>
                          <div className="text-sm text-gray-600">Remaining</div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Tasks */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-medium">Tasks</Label>
                    <Button
                      size="sm"
                      onClick={() => openCreateTask(selectedProject.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  {selectedProject.project_tasks && selectedProject.project_tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProject.project_tasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={(e) => updateTask(task.id, { status: e.target.checked ? 'completed' : 'todo' })}
                            className="h-4 w-4"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </span>
                              <Badge className={`text-xs ${getTaskStatusColor(task.status || 'todo')}`}>
                                {(task.status || 'todo').replace('_', ' ')}
                              </Badge>
                              {task.due_date && isOverdue(task.due_date) && (
                                <Badge variant="destructive" className="text-xs">Overdue</Badge>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            
                            {task.due_date && (
                              <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {timeTracker[task.id] ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => stopTimeTracking(task.id)}
                                className="text-xs"
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                {formatTimeTracked(task.id)}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startTimeTracking(task.id)}
                                className="text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Track
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => deleteTask(task.id)}>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No tasks yet. Add your first task to get started!</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProjectModal(false)}>
                  Close
                </Button>
                <Button onClick={() => openCreateTask(selectedProject.id)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Add a task to help organize and track your project work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Task Title</Label>
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
                placeholder="Task description (optional)..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-status">Status</Label>
                <Select value={taskForm.status} onValueChange={(value) => setTaskForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>
              Cancel
            </Button>
            <Button onClick={addTask}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}