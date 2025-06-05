'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description?: string | null
  status: string | null
  priority: string | null
  due_date?: string | null
  created_at: string
  categories?: {
    name: string
    icon: string | null
    color: string | null
  } | null
}

interface TasksListProps {
  tasks: Task[]
}

export function TasksList({ tasks }: TasksListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all')
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date')
  const supabase = createClient()

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error

      toast.success('Task completed!')
      window.location.reload()
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      toast.success('Task deleted!')
      window.location.reload()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
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
    return isBefore(parseISO(dueDate), startOfDay(new Date()))
  }

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending':
        return task.status === 'pending'
      case 'completed':
        return task.status === 'completed'
      case 'overdue':
        return task.status === 'pending' && isOverdue(task.due_date)
      default:
        return true
    }
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      default:
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Tasks List</h3>
        <div className="flex items-center space-x-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="created_at">Sort by Created</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No tasks found</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                task.status === 'completed' 
                  ? 'bg-green-50 border-green-200' 
                  : isOverdue(task.due_date)
                  ? 'bg-red-50 border-red-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={() => handleCompleteTask(task.id)}
                disabled={task.status === 'completed'}
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </Button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h3>
                  {task.priority && (
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                  )}
                  {isOverdue(task.due_date) && task.status === 'pending' && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {task.due_date && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Due {format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {task.categories && (
                    <div className="flex items-center space-x-1">
                      <span>{task.categories.icon}</span>
                      <span>{task.categories.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                onClick={() => handleDeleteTask(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
