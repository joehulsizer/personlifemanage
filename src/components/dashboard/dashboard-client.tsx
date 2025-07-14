'use client'

import { useState } from 'react'
import { TodaySection } from './today-section'
import { UpcomingSection } from './upcoming-section'

interface DashboardClientProps {
  todayTasks: any[]
  todayEvents: any[]
  upcomingTasks: any[]
  upcomingEvents: any[]
}

export function DashboardClient({ 
  todayTasks: initialTodayTasks, 
  todayEvents, 
  upcomingTasks: initialUpcomingTasks, 
  upcomingEvents 
}: DashboardClientProps) {
  const [todayTasks, setTodayTasks] = useState(initialTodayTasks || [])
  const [upcomingTasks, setUpcomingTasks] = useState(initialUpcomingTasks || [])

  const handleTaskUpdate = (taskId: string, updates: any) => {
    setTodayTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ))
    setUpcomingTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TodaySection
        tasks={todayTasks}
        events={todayEvents || []}
        onTaskUpdate={handleTaskUpdate}
      />

      <UpcomingSection
        tasks={upcomingTasks}
        events={upcomingEvents || []}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  )
}
