'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckSquare, Filter, Calendar, AlertCircle, Clock, Plus, List, Kanban } from 'lucide-react'
import { TasksKanban } from '@/components/tasks/tasks-kanban'
import { TasksList } from '@/components/tasks/tasks-list'
import { TasksQuickAdd } from '@/components/tasks/tasks-quick-add'
import { TasksFilters, TaskFiltersState } from '@/components/tasks/tasks-filters'
import { parseISO, isBefore, startOfDay, isSameDay, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns'

interface TasksPageContentProps {
  tasks: any[]
  categories: any[]
  pendingTasks: any[]
  inProgressTasks: any[]
  completedTasks: any[]
  overdueTasks: any[]
  highPriorityTasks: any[]
  mediumPriorityTasks: any[]
  lowPriorityTasks: any[]
  tasksByCategory: Record<string, any[]>
}

export function TasksPageContent({ 
  tasks, 
  categories, 
  pendingTasks, 
  inProgressTasks, 
  completedTasks, 
  overdueTasks, 
  highPriorityTasks, 
  mediumPriorityTasks, 
  lowPriorityTasks, 
  tasksByCategory 
}: TasksPageContentProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [filters, setFilters] = useState<TaskFiltersState>({
    status: 'all',
    due: 'all',
    priority: 'all',
    category: 'all'
  })

  const filteredTasks = tasks.filter(task => {
    if (filters.status !== 'all' && task.status !== filters.status) {
      return false
    }

    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false
    }

    if (filters.category !== 'all' && task.categories?.name !== filters.category) {
      return false
    }

    if (filters.due !== 'all') {
      if (!task.due_date) return false
      const dueDate = parseISO(task.due_date)
      switch (filters.due) {
        case 'overdue':
          return isBefore(dueDate, startOfDay(new Date()))
        case 'today':
          return isSameDay(dueDate, new Date())
        case 'week':
          return isWithinInterval(dueDate, {
            start: startOfWeek(new Date()),
            end: endOfWeek(new Date())
          })
        default:
          return true
      }
    }

    return true
  })
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <CheckSquare className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600">Manage all your tasks across categories</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{pendingTasks.length} pending</span>
          </Badge>
          {overdueTasks.length > 0 && (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3" />
              <span>{overdueTasks.length} overdue</span>
            </Badge>
          )}
          <Button 
            size="sm" 
            className="flex items-center space-x-1"
            onClick={() => setShowNewTaskModal(true)}
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Quick Add */}
      <TasksQuickAdd categories={categories || []} />
{/* Filters */}
<TasksFilters categories={categories || []} onChange={setFilters} />
      {/* Stats Overview update with filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{filteredTasks.filter(task => task.status === 'pending').length}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{filteredTasks.filter(task => task.status === 'in_progress').length}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{filteredTasks.filter(task => task.status === 'completed').length}</div>
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
                <div className="text-2xl font-bold">{filteredTasks.filter(task => task.status === 'overdue').length}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{Object.keys(filteredTasks.filter(task => task.status === 'completed')).length}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <div className="h-3 w-3 bg-red-500 rounded-full"></div>
              <span>High Priority ({filteredTasks.filter(task => task.priority === 'high').length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {filteredTasks.filter(task => task.priority === 'high').slice(0, 3).map((task) => (
                <div key={task.id} className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-500">
                  <div className="font-medium">{task.title}</div>
                  {task.categories && (
                    <div className="text-xs text-gray-500 mt-1">
                      {task.categories.icon} {task.categories.name}
                    </div>
                  )}
                </div>
              ))}
              {filteredTasks.filter(task => task.priority === 'high').length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{filteredTasks.filter(task => task.priority === 'high').length - 3} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
              <span>Medium Priority ({filteredTasks.filter(task => task.priority === 'medium').length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {filteredTasks.filter(task => task.priority === 'medium').slice(0, 3).map((task) => (
                <div key={task.id} className="text-sm p-2 bg-yellow-50 rounded border-l-2 border-yellow-500">
                  <div className="font-medium">{task.title}</div>
                  {task.categories && (
                    <div className="text-xs text-gray-500 mt-1">
                      {task.categories.icon} {task.categories.name}
                    </div>
                  )}
                </div>
              ))}
              {mediumPriorityTasks.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{mediumPriorityTasks.length - 3} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span>Low Priority ({lowPriorityTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {lowPriorityTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="text-sm p-2 bg-green-50 rounded border-l-2 border-green-500">
                  <div className="font-medium">{task.title}</div>
                  {task.categories && (
                    <div className="text-xs text-gray-500 mt-1">
                      {task.categories.icon} {task.categories.name}
                    </div>
                  )}
                </div>
              ))}
              {lowPriorityTasks.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{lowPriorityTasks.length - 3} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tasks View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5" />
              <span>All Tasks</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <Kanban className="h-4 w-4 mr-1" />
                Board
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'kanban' ? (
            <TasksKanban tasks={filteredTasks || []} />
          ) : (
            <TasksList tasks={filteredTasks || []} />
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Tasks by Category</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tasksByCategory).map(([categoryName, categoryTasks]) => {
              const pendingCount = categoryTasks.filter(t => t.status === 'pending').length
              const completedCount = categoryTasks.filter(t => t.status === 'completed').length
              const category = categories?.find(c => c.name === categoryName)

              return (
                <div key={categoryName} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg">{category?.icon || '📁'}</span>
                    <div>
                      <div className="font-medium">{categoryName}</div>
                      <div className="text-sm text-gray-500">{categoryTasks.length} total</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending</span>
                      <span className="font-medium">{pendingCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium">{completedCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${categoryTasks.length > 0 ? (completedCount / categoryTasks.length) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
            <TasksQuickAdd categories={categories || []} />
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowNewTaskModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 