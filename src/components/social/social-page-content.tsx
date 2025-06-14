'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, Calendar, Phone, MessageCircle, Heart, Plus, Coffee, Gift,
  Search, Filter, Eye, Edit, Trash2, UserPlus, Clock, Star,
  MapPin, Mail, Cake, CheckCircle, AlertCircle, User, X
} from 'lucide-react'
import { format, addDays, differenceInDays, parseISO, isToday, isPast } from 'date-fns'
import { toast } from 'sonner'

interface SocialEvent {
  id: string
  title: string
  description?: string | null
  start_at: string
  end_at: string
  location?: string | null
  created_at: string
  categories?: {
    name: string
    icon: string | null
    color: string | null
  } | null
}

interface SocialTask {
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

interface Contact {
  id: string
  title: string | null
  content_md: string | null
  created_at: string
  updated_at: string
}

interface SocialPageContentProps {
  user: any
  socialEvents: SocialEvent[]
  socialTasks: SocialTask[]
  contacts: Contact[]
  categories: any[]
  socialCategoryId: string
}

export function SocialPageContent({ 
  user, 
  socialEvents: initialEvents, 
  socialTasks: initialTasks, 
  contacts: initialContacts,
  categories,
  socialCategoryId
}: SocialPageContentProps) {
  const supabase = createClient()
  
  // State management
  const [events, setEvents] = useState(initialEvents)
  const [tasks, setTasks] = useState(initialTasks)
  const [contacts, setContacts] = useState(initialContacts)
  const [activeView, setActiveView] = useState<'overview' | 'contacts' | 'events' | 'tasks' | 'calendar'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showEventModal, setShowEventModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SocialEvent | null>(null)
  const [editingTask, setEditingTask] = useState<SocialTask | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
    location: ''
  })

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  })

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    relationship: '',
    notes: '',
    lastContact: '',
    socialMedia: ''
  })

  // Parse contact data
  const parseContactData = (contact: Contact) => {
    try {
      const data = JSON.parse(contact.content_md || '{}')
      return {
        name: contact.title?.replace('CONTACT: ', '') || '',
        phone: data.phone || '',
        email: data.email || '',
        birthday: data.birthday || '',
        relationship: data.relationship || '',
        notes: data.notes || '',
        lastContact: data.lastContact || '',
        socialMedia: data.socialMedia || '',
        ...data
      }
    } catch {
      return {
        name: contact.title?.replace('CONTACT: ', '') || '',
        phone: '',
        email: '',
        birthday: '',
        relationship: '',
        notes: contact.content_md || '',
        lastContact: '',
        socialMedia: ''
      }
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const nextWeek = format(addDays(now, 7), 'yyyy-MM-dd')
    
    const upcomingEvents = events.filter(event => 
      event.start_at >= today
    ).length

    const pendingTasks = tasks.filter(task => 
      task.status !== 'completed'
    ).length

    const birthdays = contacts.filter(contact => {
      const data = parseContactData(contact)
      if (!data.birthday) return false
      const birthday = new Date(data.birthday)
      const thisYear = new Date(birthday)
      thisYear.setFullYear(now.getFullYear())
      return Math.abs(differenceInDays(thisYear, now)) <= 7
    }).length

    const thisWeekEvents = events.filter(event => 
      event.start_at >= today && event.start_at <= nextWeek
    ).length

    return {
      upcomingEvents,
      pendingTasks,
      birthdays,
      thisWeekEvents,
      totalContacts: contacts.length
    }
  }, [events, tasks, contacts])

  // Filter data based on search
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase()
    
    return {
      events: events.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      ),
      tasks: tasks.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      ),
      contacts: contacts.filter(contact => {
        const data = parseContactData(contact)
        return data.name.toLowerCase().includes(query) ||
               data.relationship.toLowerCase().includes(query) ||
               data.notes.toLowerCase().includes(query)
      })
    }
  }, [events, tasks, contacts, searchQuery])

  // Add event
  const addEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.start_at || !eventForm.end_at) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventForm.title,
          description: eventForm.description || null,
          start_at: eventForm.start_at,
          end_at: eventForm.end_at,
          location: eventForm.location || null,
          category_id: socialCategoryId,
          user_id: user.id
        }])
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .single()

      if (error) throw error

      setEvents(prev => [data, ...prev])
      setEventForm({ title: '', description: '', start_at: '', end_at: '', location: '' })
      setShowEventModal(false)
      toast.success('Social event created!')
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    }
  }

  // Update event
  const updateEvent = async (eventId: string, updates: Partial<SocialEvent>) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .single()

      if (error) throw error

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...data } : event
      ))
      toast.success('Event updated!')
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event')
    }
  }

  // Delete event
  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      setEvents(prev => prev.filter(event => event.id !== eventId))
      toast.success('Event deleted!')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  // Add task
  const addTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          status: 'pending',
          category_id: socialCategoryId,
          user_id: user.id
        }])
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .single()

      if (error) throw error

      setTasks(prev => [data, ...prev])
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' })
      setShowTaskModal(false)
      toast.success('Social task created!')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  // Complete task
  const completeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed', completed_at: new Date().toISOString() }
          : task
      ))
      toast.success('Task completed!')
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  // Delete task
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

  // Add contact
  const addContact = async () => {
    if (!contactForm.name.trim()) {
      toast.error('Please enter a contact name')
      return
    }

    try {
      const contactData = {
        phone: contactForm.phone,
        email: contactForm.email,
        birthday: contactForm.birthday,
        relationship: contactForm.relationship,
        notes: contactForm.notes,
        lastContact: contactForm.lastContact,
        socialMedia: contactForm.socialMedia
      }

      const { data, error } = await supabase
        .from('notes')
        .insert([{
          title: `CONTACT: ${contactForm.name}`,
          content_md: JSON.stringify(contactData),
          category_id: socialCategoryId,
          user_id: user.id
        }])
        .select('*')
        .single()

      if (error) throw error

      setContacts(prev => [data, ...prev])
      setContactForm({ 
        name: '', phone: '', email: '', birthday: '', relationship: '', 
        notes: '', lastContact: '', socialMedia: '' 
      })
      setShowContactModal(false)
      toast.success('Contact added!')
    } catch (error) {
      console.error('Error adding contact:', error)
      toast.error('Failed to add contact')
    }
  }

  // Update contact
  const updateContact = async (contactId: string) => {
    if (!contactForm.name.trim()) {
      toast.error('Please enter a contact name')
      return
    }

    try {
      const contactData = {
        phone: contactForm.phone,
        email: contactForm.email,
        birthday: contactForm.birthday,
        relationship: contactForm.relationship,
        notes: contactForm.notes,
        lastContact: contactForm.lastContact,
        socialMedia: contactForm.socialMedia
      }

      const { data, error } = await supabase
        .from('notes')
        .update({
          title: `CONTACT: ${contactForm.name}`,
          content_md: JSON.stringify(contactData),
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .select('*')
        .single()

      if (error) throw error

      setContacts(prev => prev.map(contact => 
        contact.id === contactId ? data : contact
      ))
      setEditingContact(null)
      setShowContactModal(false)
      toast.success('Contact updated!')
    } catch (error) {
      console.error('Error updating contact:', error)
      toast.error('Failed to update contact')
    }
  }

  // Delete contact
  const deleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', contactId)

      if (error) throw error

      setContacts(prev => prev.filter(contact => contact.id !== contactId))
      toast.success('Contact deleted!')
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Failed to delete contact')
    }
  }

  // Quick actions
  const quickActions = [
    {
      title: 'Call Friend',
      icon: Phone,
      color: 'bg-blue-100 text-blue-600',
      action: () => {
        setTaskForm({
          title: 'Call a friend',
          description: 'Catch up with someone I haven\'t talked to in a while',
          priority: 'medium',
          due_date: format(new Date(), 'yyyy-MM-dd')
        })
        setShowTaskModal(true)
      }
    },
    {
      title: 'Coffee Date',
      icon: Coffee,
      color: 'bg-amber-100 text-amber-600',
      action: () => {
        const tomorrow = addDays(new Date(), 1)
        setEventForm({
          title: 'Coffee with friend',
          description: 'Casual coffee meetup',
          start_at: format(tomorrow, 'yyyy-MM-dd\'T\'10:00'),
          end_at: format(tomorrow, 'yyyy-MM-dd\'T\'11:00'),
          location: 'Local coffee shop'
        })
        setShowEventModal(true)
      }
    },
    {
      title: 'Send Gift',
      icon: Gift,
      color: 'bg-red-100 text-red-600',
      action: () => {
        setTaskForm({
          title: 'Send a gift',
          description: 'Pick out and send a thoughtful gift',
          priority: 'medium',
          due_date: format(addDays(new Date(), 3), 'yyyy-MM-dd')
        })
        setShowTaskModal(true)
      }
    },
    {
      title: 'Plan Event',
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600',
      action: () => {
        const nextWeek = addDays(new Date(), 7)
        setEventForm({
          title: 'Social gathering',
          description: 'Plan a fun event with friends',
          start_at: format(nextWeek, 'yyyy-MM-dd\'T\'18:00'),
          end_at: format(nextWeek, 'yyyy-MM-dd\'T\'21:00'),
          location: 'TBD'
        })
        setShowEventModal(true)
      }
    }
  ]

  // Format date/time functions
  const formatEventTime = (dateString: string) => {
    const date = parseISO(dateString)
    return format(date, 'MMM d, h:mm a')
  }

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy')
  }

  const getDaysUntilBirthday = (birthday: string) => {
    if (!birthday) return null
    const today = new Date()
    const birthdayDate = new Date(birthday)
    const thisYear = new Date(birthdayDate)
    thisYear.setFullYear(today.getFullYear())
    
    if (thisYear < today) {
      thisYear.setFullYear(today.getFullYear() + 1)
    }
    
    return differenceInDays(thisYear, today)
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return isPast(parseISO(dueDate)) && !isToday(parseISO(dueDate))
  }

  const openEditContact = (contact: Contact) => {
    const data = parseContactData(contact)
    setContactForm(data)
    setEditingContact(contact)
    setShowContactModal(true)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-pink-100 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Life</h1>
            <p className="text-gray-600">Manage your relationships and social connections</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contacts, events, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button
            onClick={() => setShowContactModal(true)}
            size="sm"
            className="flex items-center space-x-1"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview', icon: Eye },
          { key: 'contacts', label: 'Contacts', icon: Users },
          { key: 'events', label: 'Events', icon: Calendar },
          { key: 'tasks', label: 'Tasks', icon: MessageCircle }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeView === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView(key as any)}
            className="flex items-center space-x-1"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Stats Overview */}
      {activeView === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                    <div className="text-sm text-gray-600">Upcoming</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.pendingTasks}</div>
                    <div className="text-sm text-gray-600">To Do</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.birthdays}</div>
                    <div className="text-sm text-gray-600">Birthdays</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-5 w-5 text-amber-600" />
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
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalContacts}</div>
                    <div className="text-sm text-gray-600">Contacts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Upcoming Events</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEventModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredData.events.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No upcoming events</p>
                    <p className="text-xs mt-1">Plan something fun!</p>
                  </div>
                ) : (
                  filteredData.events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-pink-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{event.title}</div>
                          <div className="text-xs text-gray-500">
                            {formatEventTime(event.start_at)}
                          </div>
                          {event.location && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingEvent(event)
                            setEventForm({
                              title: event.title,
                              description: event.description || '',
                              start_at: event.start_at,
                              end_at: event.end_at,
                              location: event.location || ''
                            })
                            setShowEventModal(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Social Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>Social Tasks</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTaskModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredData.tasks.filter(t => t.status !== 'completed').slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No pending social tasks</p>
                    <p className="text-xs mt-1">Stay connected with friends!</p>
                  </div>
                ) : (
                  filteredData.tasks.filter(t => t.status !== 'completed').slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => completeTask(task.id)}
                          className="h-5 w-5 rounded border-2 border-gray-300 hover:border-green-500 flex items-center justify-center transition-colors"
                        >
                          {task.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-500 fill-current" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium text-sm flex items-center space-x-2">
                            <span>{task.title}</span>
                            {task.priority && (
                              <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                            )}
                            {isOverdue(task.due_date) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          {task.due_date && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              Due {formatDate(task.due_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Quick Social Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-20 flex-col space-y-1"
                    onClick={action.action}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm">{action.title}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Contacts View */}
      {activeView === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Contacts</h2>
            <Button onClick={() => setShowContactModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.contacts.map((contact) => {
              const data = parseContactData(contact)
              const daysUntilBirthday = getDaysUntilBirthday(data.birthday)
              
              return (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{data.name}</h3>
                          {data.relationship && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {data.relationship}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedContact(contact)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditContact(contact)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteContact(contact.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      {data.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{data.phone}</span>
                        </div>
                      )}
                      {data.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>{data.email}</span>
                        </div>
                      )}
                      {data.birthday && (
                        <div className="flex items-center space-x-2">
                          <Cake className="h-4 w-4" />
                          <span>
                            {format(parseISO(data.birthday), 'MMM d')}
                            {daysUntilBirthday !== null && daysUntilBirthday <= 7 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {daysUntilBirthday === 0 ? 'Today!' : `${daysUntilBirthday} days`}
                              </Badge>
                            )}
                          </span>
                        </div>
                      )}
                      {data.lastContact && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Last: {formatDate(data.lastContact)}</span>
                        </div>
                      )}
                    </div>

                    {data.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        {data.notes.length > 100 ? `${data.notes.substring(0, 100)}...` : data.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredData.contacts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No contacts yet</p>
              <p className="text-sm mb-4">Start building your social network!</p>
              <Button onClick={() => setShowContactModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Events View */}
      {activeView === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Social Events</h2>
            <Button onClick={() => setShowEventModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="space-y-3">
            {filteredData.events.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        <div className="text-sm text-gray-600 flex items-center space-x-4">
                          <span>{formatEventTime(event.start_at)} - {formatEventTime(event.end_at)}</span>
                          {event.location && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingEvent(event)
                          setEventForm({
                            title: event.title,
                            description: event.description || '',
                            start_at: event.start_at,
                            end_at: event.end_at,
                            location: event.location || ''
                          })
                          setShowEventModal(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredData.events.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No events scheduled</p>
              <p className="text-sm mb-4">Plan your next social gathering!</p>
              <Button onClick={() => setShowEventModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tasks View */}
      {activeView === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Social Tasks</h2>
            <Button onClick={() => setShowTaskModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="space-y-3">
            {filteredData.tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => completeTask(task.id)}
                        className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-colors ${
                          task.status === 'completed' 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {task.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </button>
                      <div>
                        <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {task.priority && (
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          )}
                          {task.due_date && (
                            <span className={`flex items-center ${isOverdue(task.due_date) ? 'text-red-600' : ''}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              Due {formatDate(task.due_date)}
                              {isOverdue(task.due_date) && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </span>
                          )}
                          {task.completed_at && (
                            <span className="text-green-600 text-xs">
                              ✅ Completed {formatDate(task.completed_at)}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredData.tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No tasks scheduled</p>
              <p className="text-sm mb-4">Stay connected with friends!</p>
              <Button onClick={() => setShowTaskModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Task
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEventModal(false)
                    setEditingEvent(null)
                    setEventForm({ title: '', description: '', start_at: '', end_at: '', location: '' })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Event title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What's this event about?"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_at">Start Date & Time *</Label>
                    <Input
                      id="start_at"
                      type="datetime-local"
                      value={eventForm.start_at}
                      onChange={(e) => setEventForm(prev => ({ ...prev, start_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_at">End Date & Time *</Label>
                    <Input
                      id="end_at"
                      type="datetime-local"
                      value={eventForm.end_at}
                      onChange={(e) => setEventForm(prev => ({ ...prev, end_at: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Where will this happen?"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEventModal(false)
                    setEditingEvent(null)
                    setEventForm({ title: '', description: '', start_at: '', end_at: '', location: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingEvent) {
                      updateEvent(editingEvent.id, eventForm)
                      setEditingEvent(null)
                      setShowEventModal(false)
                    } else {
                      addEvent()
                    }
                  }}
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Title *</Label>
                  <Input
                    id="task-title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What do you need to do?"
                  />
                </div>

                <div>
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingTask) {
                      // Add update task functionality here if needed
                      setEditingTask(null)
                      setShowTaskModal(false)
                    } else {
                      addTask()
                    }
                  }}
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowContactModal(false)
                    setEditingContact(null)
                    setContactForm({ 
                      name: '', phone: '', email: '', birthday: '', relationship: '', 
                      notes: '', lastContact: '', socialMedia: '' 
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact-name">Name *</Label>
                  <Input
                    id="contact-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={contactForm.birthday}
                      onChange={(e) => setContactForm(prev => ({ ...prev, birthday: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="relationship">Relationship</Label>
                    <Input
                      id="relationship"
                      value={contactForm.relationship}
                      onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                      placeholder="Friend, Family, etc."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="last-contact">Last Contact</Label>
                  <Input
                    id="last-contact"
                    type="date"
                    value={contactForm.lastContact}
                    onChange={(e) => setContactForm(prev => ({ ...prev, lastContact: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="social-media">Social Media</Label>
                  <Input
                    id="social-media"
                    value={contactForm.socialMedia}
                    onChange={(e) => setContactForm(prev => ({ ...prev, socialMedia: e.target.value }))}
                    placeholder="Instagram, Twitter, LinkedIn handles"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={contactForm.notes}
                    onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Personal notes about this person..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowContactModal(false)
                    setEditingContact(null)
                    setContactForm({ 
                      name: '', phone: '', email: '', birthday: '', relationship: '', 
                      notes: '', lastContact: '', socialMedia: '' 
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingContact) {
                      updateContact(editingContact.id)
                    } else {
                      addContact()
                    }
                  }}
                >
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{parseContactData(selectedContact).name}</h2>
                    {parseContactData(selectedContact).relationship && (
                      <Badge variant="outline" className="mt-1">
                        {parseContactData(selectedContact).relationship}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContact(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {parseContactData(selectedContact).phone && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="font-medium">{parseContactData(selectedContact).phone}</div>
                    </div>
                  </div>
                )}

                {parseContactData(selectedContact).email && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{parseContactData(selectedContact).email}</div>
                    </div>
                  </div>
                )}

                {parseContactData(selectedContact).birthday && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Cake className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-600">Birthday</div>
                      <div className="font-medium">
                        {format(parseISO(parseContactData(selectedContact).birthday), 'MMMM d, yyyy')}
                        {(() => {
                          const days = getDaysUntilBirthday(parseContactData(selectedContact).birthday)
                          if (days !== null && days <= 30) {
                            return (
                              <Badge variant="secondary" className="ml-2">
                                {days === 0 ? 'Today!' : `${days} days away`}
                              </Badge>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {parseContactData(selectedContact).lastContact && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-600">Last Contact</div>
                      <div className="font-medium">{formatDate(parseContactData(selectedContact).lastContact)}</div>
                    </div>
                  </div>
                )}

                {parseContactData(selectedContact).socialMedia && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-600">Social Media</div>
                      <div className="font-medium">{parseContactData(selectedContact).socialMedia}</div>
                    </div>
                  </div>
                )}

                {parseContactData(selectedContact).notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Notes</div>
                    <div className="text-sm whitespace-pre-wrap">{parseContactData(selectedContact).notes}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTaskForm({
                        title: `Call ${parseContactData(selectedContact).name}`,
                        description: 'Catch up with them',
                        priority: 'medium',
                        due_date: format(new Date(), 'yyyy-MM-dd')
                      })
                      setSelectedContact(null)
                      setShowTaskModal(true)
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Schedule Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tomorrow = addDays(new Date(), 1)
                      setEventForm({
                        title: `Meet with ${parseContactData(selectedContact).name}`,
                        description: 'Social meetup',
                        start_at: format(tomorrow, 'yyyy-MM-dd\'T\'18:00'),
                        end_at: format(tomorrow, 'yyyy-MM-dd\'T\'19:00'),
                        location: 'TBD'
                      })
                      setSelectedContact(null)
                      setShowEventModal(true)
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Plan Meeting
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    openEditContact(selectedContact)
                    setSelectedContact(null)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Contact
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
