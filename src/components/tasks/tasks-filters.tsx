'use client'

import { useEffect, useState } from 'react'

export interface TaskFiltersState {
  status: 'all' | 'pending' | 'in_progress' | 'completed'
  due: 'all' | 'today' | 'week' | 'overdue'
  priority: 'all' | 'high' | 'medium' | 'low'
  category: 'all' | string
}

interface Category {
  id: string
  name: string
  icon?: string | null
}

interface TasksFiltersProps {
  categories: Category[]
  onChange: (filters: TaskFiltersState) => void
}

export function TasksFilters({ categories, onChange }: TasksFiltersProps) {
  const [status, setStatus] = useState<TaskFiltersState['status']>('all')
  const [due, setDue] = useState<TaskFiltersState['due']>('all')
  const [priority, setPriority] = useState<TaskFiltersState['priority']>('all')
  const [category, setCategory] = useState<TaskFiltersState['category']>('all')

  useEffect(() => {
    onChange({ status, due, priority, category })
  }, [status, due, priority, category, onChange])
  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskFiltersState['status'])}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={due}
          onChange={(e) => setDue(e.target.value as TaskFiltersState['due'])}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="all">Any Due Date</option>
          <option value="today">Due Today</option>
          <option value="week">Due This Week</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskFiltersState['priority'])}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
