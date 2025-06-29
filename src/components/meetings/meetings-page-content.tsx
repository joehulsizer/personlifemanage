'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, Users, Video, Phone, Clock, Plus, MapPin, Mail, Search, 
  Edit3, Trash2, FileText, CheckSquare, UserPlus, ExternalLink,
  Settings, Filter, MoreVertical, Copy, Share, Bell, Download
} from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, isThisWeek, isPast, isFuture } from 'date-fns'
import { toast } from 'sonner'

interface Meeting {
  id: string
  title: string
  description?: string | null
  start_at: string
  end_at: string
  location?: string | null
  created_at: string
}

interface Contact {
  id: string
  title: string | null
  content_md: string | null
  created_at: string
  updated_at: string
}

interface MeetingsPageContentProps {
  user: any
  meetings: Meeting[]
  contacts: Contact[]
  categories: any[]
  meetingsCategoryId: string
}

export function MeetingsPageContent({ 
  user, 
  meetings: initialMeetings, 
  contacts: initialContacts,
  categories,
  meetingsCategoryId
}: MeetingsPageContentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'overview' | 'calendar' | 'contacts' | 'agenda'>('overview')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all')
  
  // Meeting form state
  const [isAddingMeeting, setIsAddingMeeting] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
    attendees: '',
    agenda: '',
    meeting_type: 'general'
  })

  // Contact form state
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    notes: ''
  })

  // Selected meeting for detailed view
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Agenda builder state
  const [selectedAgendaMeetingId, setSelectedAgendaMeetingId] = useState('')
  const [agendaItems, setAgendaItems] = useState<string[]>([])
  const [newAgendaItem, setNewAgendaItem] = useState('')

  useEffect(() => {
    if (!selectedAgendaMeetingId) {
      setAgendaItems([])
      return
    }
    const meeting = meetings.find(m => m.id === selectedAgendaMeetingId)
    if (meeting) {
      const parsed = parseMeetingDescription(meeting.description || '')
      const items = parsed.agenda
        ? parsed.agenda.split('\n').map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean)
        : []
      setAgendaItems(items)
    }
  }, [selectedAgendaMeetingId, meetings])

  const addAgendaItem = () => {
    if (!newAgendaItem.trim()) return
    setAgendaItems(prev => [...prev, newAgendaItem.trim()])
    setNewAgendaItem('')
  }

  const removeAgendaItem = (index: number) => {
    setAgendaItems(prev => prev.filter((_, i) => i !== index))
  }

  const saveAgenda = () => {
    if (!selectedAgendaMeetingId) return
    const meeting = meetings.find(m => m.id === selectedAgendaMeetingId)
    if (!meeting) return
    const parsed = parseMeetingDescription(meeting.description || '')
    const agendaText = agendaItems.map(item => `• ${item}`).join('\n')
    const newDescription = buildMeetingDescription({
      base: parsed.base,
      attendees: parsed.attendees,
      agenda: agendaText,
      meeting_type: parsed.meeting_type
    })
    updateMeeting(meeting.id, { description: newDescription })
  }

  const supabase = createClient()

  // Parse contact data from markdown content
  const parseContactData = (contact: Contact) => {
    const content = contact.content_md || ''
    const name = contact.title?.replace('CONTACT: ', '') || 'Unknown'
    
    const emailMatch = content.match(/Email: (.+)/i)
    const phoneMatch = content.match(/Phone: (.+)/i)
    const companyMatch = content.match(/Company: (.+)/i)
    const roleMatch = content.match(/Role: (.+)/i)
    
    return {
      name,
      email: emailMatch?.[1] || '',
      phone: phoneMatch?.[1] || '',
      company: companyMatch?.[1] || '',
      role: roleMatch?.[1] || '',
      notes: content.replace(/Email: .+\n?/gi, '').replace(/Phone: .+\n?/gi, '').replace(/Company: .+\n?/gi, '').replace(/Role: .+\n?/gi, '').trim()
    }
  }
// Parse meeting description sections
const parseMeetingDescription = (desc: string | null) => {
  const base = desc?.split('\n\nAttendees:')[0] || ''
  const attendeesMatch = desc?.match(/Attendees:\s*([\s\S]*?)(?:\n\n|$)/i)
  const agendaMatch = desc?.match(/Agenda:\s*([\s\S]*?)(?:\n\n|$)/i)
  const typeMatch = desc?.match(/Type:\s*([\s\S]*?)(?:\n\n|$)/i)

  return {
    base: base.trim(),
    attendees: attendeesMatch ? attendeesMatch[1].trim() : '',
    agenda: agendaMatch ? agendaMatch[1].trim() : '',
    meeting_type: typeMatch ? typeMatch[1].trim() : ''
  }
}

const buildMeetingDescription = (parts: { base: string; attendees: string; agenda: string; meeting_type: string }) => {
  return [
    parts.base,
    parts.attendees ? `Attendees: ${parts.attendees}` : '',
    parts.agenda ? `Agenda: ${parts.agenda}` : '',
    parts.meeting_type ? `Type: ${parts.meeting_type}` : ''
  ].filter(Boolean).join('\n\n')
}
  // Filter and search meetings
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    const meetingDate = parseISO(meeting.start_at)
    
    switch (selectedFilter) {
      case 'today':
        return isToday(meetingDate)
      case 'upcoming':
        return isFuture(meetingDate)
      case 'past':
        return isPast(meetingDate)
      default:
        return true
    }
  })

  // Group meetings
  const now = new Date()
  const todayMeetings = meetings.filter(meeting => isToday(parseISO(meeting.start_at)))
  const upcomingMeetings = meetings.filter(meeting => isFuture(parseISO(meeting.start_at)))
  const pastMeetings = meetings.filter(meeting => isPast(parseISO(meeting.start_at)))

  // Add meeting
  const addMeeting = async () => {
    if (!meetingForm.title.trim() || !meetingForm.start_date || !meetingForm.start_time) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      const startAt = `${meetingForm.start_date}T${meetingForm.start_time}:00`
      const endAt = meetingForm.end_date && meetingForm.end_time 
        ? `${meetingForm.end_date}T${meetingForm.end_time}:00`
        : new Date(new Date(startAt).getTime() + 60 * 60000).toISOString() // Default 1 hour

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          category_id: meetingsCategoryId,
          title: meetingForm.title,
          description: buildMeetingDescription({
            base: meetingForm.description,
            attendees: meetingForm.attendees,
            agenda: meetingForm.agenda,
            meeting_type: meetingForm.meeting_type
          }),
          start_at: startAt,
          end_at: endAt,
          location: meetingForm.location || null
        })
        .select()
        .single()

      if (error) throw error

      setMeetings(prev => [data, ...prev])
      setMeetingForm({
        title: '',
        description: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        location: '',
        attendees: '',
        agenda: '',
        meeting_type: 'general'
      })
      setIsAddingMeeting(false)
      toast.success('Meeting scheduled!')
    } catch (error) {
      console.error('Error adding meeting:', error)
      toast.error('Failed to schedule meeting')
    }
  }

  // Update meeting
  const updateMeeting = async (meetingId: string, updates: Partial<Meeting>) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId ? { ...meeting, ...data } : meeting
      ))
      toast.success('Meeting updated!')
    } catch (error) {
      console.error('Error updating meeting:', error)
      toast.error('Failed to update meeting')
    }
  }

  // Delete meeting
  const deleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', meetingId)

      if (error) throw error

      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId))
      toast.success('Meeting deleted!')
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast.error('Failed to delete meeting')
    }
  }

  // Add contact
  const addContact = async () => {
    if (!contactForm.name.trim()) {
      toast.error('Please enter contact name')
      return
    }

    try {
      const contactContent = [
        contactForm.email ? `Email: ${contactForm.email}` : '',
        contactForm.phone ? `Phone: ${contactForm.phone}` : '',
        contactForm.company ? `Company: ${contactForm.company}` : '',
        contactForm.role ? `Role: ${contactForm.role}` : '',
        contactForm.notes ? `\nNotes:\n${contactForm.notes}` : ''
      ].filter(Boolean).join('\n')

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          category_id: meetingsCategoryId,
          title: `CONTACT: ${contactForm.name}`,
          content_md: contactContent
        })
        .select()
        .single()

      if (error) throw error

      setContacts(prev => [data, ...prev])
      setContactForm({ name: '', email: '', phone: '', company: '', role: '', notes: '' })
      setIsAddingContact(false)
      toast.success('Contact added!')
    } catch (error) {
      console.error('Error adding contact:', error)
      toast.error('Failed to add contact')
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

  // Meeting templates
  const applyTemplate = (template: string) => {
    const templates = {
      standup: {
        title: 'Daily Standup',
        description: 'Daily team standup meeting',
        agenda: '• What did you work on yesterday?\n• What will you work on today?\n• Any blockers or challenges?',
        meeting_type: 'standup'
      },
      client: {
        title: 'Client Meeting',
        description: 'Client consultation and updates',
        agenda: '• Project status update\n• Client feedback\n• Next steps\n• Questions and concerns',
        meeting_type: 'client'
      },
      review: {
        title: 'Project Review',
        description: 'Project progress review and planning',
        agenda: '• Review completed work\n• Discuss challenges\n• Plan next phase\n• Resource allocation',
        meeting_type: 'review'
      },
      oneonone: {
        title: '1:1 Meeting',
        description: 'One-on-one discussion',
        agenda: '• How are things going?\n• Any challenges or concerns?\n• Goals and objectives\n• Career development',
        meeting_type: 'oneonone'
      }
    }

    const templateData = templates[template as keyof typeof templates]
    if (templateData) {
      setMeetingForm(prev => ({ ...prev, ...templateData }))
      setIsAddingMeeting(true)
    }
  }

  // Quick actions
  const startVideoCall = (meeting: Meeting) => {
    // In a real app, this would integrate with Zoom, Teams, etc.
    const zoomUrl = `https://zoom.us/j/new`
    window.open(zoomUrl, '_blank')
    toast.success('Opening video call...')
  }

  const makePhoneCall = (meeting: Meeting) => {
    // Extract phone number from location or description
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    const phone = meeting.location?.match(phonePattern)?.[0] || meeting.description?.match(phonePattern)?.[0]
    
    if (phone) {
      window.location.href = `tel:${phone}`
      toast.success('Initiating phone call...')
    } else {
      toast.error('No phone number found for this meeting')
    }
  }

  const sendEmail = (meeting: Meeting) => {
    const subject = encodeURIComponent(`Re: ${meeting.title}`)
    const body = encodeURIComponent(`Hi,\n\nRegarding our meeting "${meeting.title}" scheduled for ${format(parseISO(meeting.start_at), 'PPP p')}.\n\nBest regards`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    toast.success('Opening email client...')
  }

  const copyMeetingLink = (meeting: Meeting) => {
    const meetingLink = `${window.location.origin}/dashboard/meetings?meeting=${meeting.id}`
    navigator.clipboard.writeText(meetingLink)
    toast.success('Meeting link copied to clipboard!')
  }
  const downloadICS = (meeting: Meeting) => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${meeting.id}`,
      `SUMMARY:${meeting.title}`,
      `DTSTART:${formatDate(meeting.start_at)}`,
      `DTEND:${formatDate(meeting.end_at)}`,
      meeting.location ? `LOCATION:${meeting.location}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ]
      .filter(Boolean)
      .join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${meeting.title.replace(/\s+/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('ICS file generated!')
  }

  // Format time helpers
  const formatMeetingTime = (dateString: string) => {
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

  const getDuration = (start: string, end: string) => {
    try {
      const startDate = parseISO(start)
      const endDate = parseISO(end)
      const minutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
      
      if (minutes < 60) {
        return `${minutes} min`
      } else {
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
      }
    } catch {
      return 'Unknown'
    }
  }

  const getMeetingStatus = (meeting: Meeting) => {
    const now = new Date()
    const startTime = parseISO(meeting.start_at)
    const endTime = parseISO(meeting.end_at)
    
    if (now < startTime) return 'upcoming'
    if (now >= startTime && now <= endTime) return 'in-progress'
    return 'completed'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'in-progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
            <p className="text-gray-600">Professional meeting management</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{todayMeetings.length} today</span>
          </Badge>
          <Button size="sm" onClick={() => setIsAddingMeeting(true)} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>New Meeting</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search meetings, attendees, or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedFilter} onValueChange={(value: any) => setSelectedFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meetings</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{todayMeetings.length}</div>
                    <div className="text-sm text-gray-600">Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
                    <div className="text-sm text-gray-600">Upcoming</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">{contacts.length}</div>
                    <div className="text-sm text-gray-600">Contacts</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{pastMeetings.length}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Today's Meetings</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsAddingMeeting(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayMeetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No meetings today</p>
                  <p className="text-xs mt-1">Enjoy your free time!</p>
                </div>
              ) : (
                todayMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{meeting.title}</div>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(meeting.start_at), 'h:mm a')} - {format(parseISO(meeting.end_at), 'h:mm a')}
                        <span className="ml-2">({getDuration(meeting.start_at, meeting.end_at)})</span>
                      </div>
                      {meeting.location && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {meeting.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(getMeetingStatus(meeting))}>
                        {getMeetingStatus(meeting)}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startVideoCall(meeting) }}>
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingMeeting(meeting) }}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5" />
                <span>Quick Meeting Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col space-y-1" onClick={() => setIsAddingMeeting(true)}>
                  <Video className="h-6 w-6" />
                  <span className="text-sm">Video Call</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-1" onClick={() => setIsAddingMeeting(true)}>
                  <Phone className="h-6 w-6" />
                  <span className="text-sm">Phone Call</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-1" onClick={() => setIsAddingContact(true)}>
                  <Mail className="h-6 w-6" />
                  <span className="text-sm">Add Contact</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-1" onClick={() => setIsAddingMeeting(true)}>
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm">Schedule</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Meeting Templates</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => applyTemplate('standup')}>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Team Standup</div>
                      <div className="text-sm text-gray-500">15 minutes</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Daily team sync and updates</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => applyTemplate('client')}>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Video className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Client Call</div>
                      <div className="text-sm text-gray-500">60 minutes</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Client consultation and updates</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => applyTemplate('review')}>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">Project Review</div>
                      <div className="text-sm text-gray-500">30 minutes</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Project progress and planning</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => applyTemplate('oneonone')}>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium">1:1 Meeting</div>
                      <div className="text-sm text-gray-500">45 minutes</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">One-on-one discussion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredMeetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No meetings found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{meeting.title}</div>
                      <div className="text-sm text-gray-500">
                        {formatMeetingTime(meeting.start_at)} ({getDuration(meeting.start_at, meeting.end_at)})
                      </div>
                      {meeting.location && (
                        <div className="text-sm text-gray-500 mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {meeting.location}
                        </div>
                      )}
                      {meeting.description && (
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">{meeting.description}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(getMeetingStatus(meeting))}>
                        {getMeetingStatus(meeting)}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startVideoCall(meeting) }}>
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyMeetingLink(meeting) }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingMeeting(meeting) }}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteMeeting(meeting.id) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Meeting Contacts</span>
                <Button size="sm" onClick={() => setIsAddingContact(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No contacts yet</p>
                  <Button size="sm" onClick={() => setIsAddingContact(true)} className="mt-2">
                    Add Your First Contact
                  </Button>
                </div>
              ) : (
                contacts.map((contact) => {
                  const contactData = parseContactData(contact)
                  return (
                    <div key={contact.id} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{contactData.name}</div>
                        {contactData.company && contactData.role && (
                          <div className="text-sm text-gray-500">{contactData.role} at {contactData.company}</div>
                        )}
                        <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                          {contactData.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {contactData.email}
                            </span>
                          )}
                          {contactData.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {contactData.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {contactData.email && (
                          <Button variant="ghost" size="sm" onClick={() => sendEmail({ title: '', start_at: '', end_at: '', id: '', created_at: '' })}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditingContact(contact)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteContact(contact.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agenda Tab */}
        <TabsContent value="agenda" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Agenda Planner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agenda-meeting">Select Meeting</Label>
                <Select value={selectedAgendaMeetingId} onValueChange={setSelectedAgendaMeetingId}>
                  <SelectTrigger id="agenda-meeting">
                    <SelectValue placeholder="Choose meeting" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetings.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

              {selectedAgendaMeetingId && (
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      value={newAgendaItem}
                      onChange={(e) => setNewAgendaItem(e.target.value)}
                      placeholder="Agenda item..."
                    />
                    <Button type="button" onClick={addAgendaItem}>Add</Button>
                  </div>
                  {agendaItems.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {agendaItems.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span>{item}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeAgendaItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button onClick={saveAgenda}>Save Agenda</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Meeting Modal */}
      {isAddingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Schedule New Meeting</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingMeeting(false)}>
                ×
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="meeting-title">Meeting Title *</Label>
                  <Input
                    id="meeting-title"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter meeting title..."
                  />
                </div>

                <div>
                  <Label htmlFor="meeting-type">Meeting Type</Label>
                  <Select value={meetingForm.meeting_type} onValueChange={(value) => setMeetingForm(prev => ({ ...prev, meeting_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Meeting</SelectItem>
                      <SelectItem value="standup">Daily Standup</SelectItem>
                      <SelectItem value="client">Client Meeting</SelectItem>
                      <SelectItem value="review">Project Review</SelectItem>
                      <SelectItem value="oneonone">1:1 Meeting</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date *</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={meetingForm.start_date}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={meetingForm.start_time}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={meetingForm.end_date}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={meetingForm.end_time}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location / Link</Label>
                  <Input
                    id="location"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Meeting room, Zoom link, or address..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Meeting description..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="attendees">Attendees</Label>
                  <Textarea
                    id="attendees"
                    value={meetingForm.attendees}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, attendees: e.target.value }))}
                    placeholder="john@company.com, jane@company.com..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="agenda">Agenda</Label>
                  <Textarea
                    id="agenda"
                    value={meetingForm.agenda}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, agenda: e.target.value }))}
                    placeholder="• Topic 1&#10;• Topic 2&#10;• Topic 3"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setIsAddingMeeting(false)}>
                Cancel
              </Button>
              <Button onClick={addMeeting}>
                Schedule Meeting
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Meeting</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingMeeting(null)}>
                ×
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-meeting-title">Meeting Title *</Label>
                  <Input
                    id="edit-meeting-title"
                    value={editingMeeting.title}
                    onChange={(e) => setEditingMeeting(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Enter meeting title..."
                  />
                </div>

                <div>
                  <Label htmlFor="edit-location">Location / Link</Label>
                  <Input
                    id="edit-location"
                    value={editingMeeting.location || ''}
                    onChange={(e) => setEditingMeeting(prev => prev ? { ...prev, location: e.target.value } : null)}
                    placeholder="Meeting room, Zoom link, or address..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-start-date">Start Date *</Label>
                    <Input
                      id="edit-start-date"
                      type="date"
                      value={editingMeeting.start_at ? format(parseISO(editingMeeting.start_at), 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (editingMeeting) {
                          const currentTime = format(parseISO(editingMeeting.start_at), 'HH:mm')
                          const newDateTime = `${e.target.value}T${currentTime}:00`
                          setEditingMeeting(prev => prev ? { ...prev, start_at: newDateTime } : null)
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-start-time">Start Time *</Label>
                    <Input
                      id="edit-start-time"
                      type="time"
                      value={editingMeeting.start_at ? format(parseISO(editingMeeting.start_at), 'HH:mm') : ''}
                      onChange={(e) => {
                        if (editingMeeting) {
                          const currentDate = format(parseISO(editingMeeting.start_at), 'yyyy-MM-dd')
                          const newDateTime = `${currentDate}T${e.target.value}:00`
                          setEditingMeeting(prev => prev ? { ...prev, start_at: newDateTime } : null)
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-end-date">End Date</Label>
                    <Input
                      id="edit-end-date"
                      type="date"
                      value={editingMeeting.end_at ? format(parseISO(editingMeeting.end_at), 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (editingMeeting) {
                          const currentTime = editingMeeting.end_at ? format(parseISO(editingMeeting.end_at), 'HH:mm') : '10:00'
                          const newDateTime = `${e.target.value}T${currentTime}:00`
                          setEditingMeeting(prev => prev ? { ...prev, end_at: newDateTime } : null)
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-end-time">End Time</Label>
                    <Input
                      id="edit-end-time"
                      type="time"
                      value={editingMeeting.end_at ? format(parseISO(editingMeeting.end_at), 'HH:mm') : ''}
                      onChange={(e) => {
                        if (editingMeeting) {
                          const currentDate = editingMeeting.end_at ? format(parseISO(editingMeeting.end_at), 'yyyy-MM-dd') : format(parseISO(editingMeeting.start_at), 'yyyy-MM-dd')
                          const newDateTime = `${currentDate}T${e.target.value}:00`
                          setEditingMeeting(prev => prev ? { ...prev, end_at: newDateTime } : null)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingMeeting.description || ''}
                    onChange={(e) => setEditingMeeting(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Meeting description..."
                    rows={8}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setEditingMeeting(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (editingMeeting) {
                  updateMeeting(editingMeeting.id, {
                    title: editingMeeting.title,
                    description: editingMeeting.description,
                    start_at: editingMeeting.start_at,
                    end_at: editingMeeting.end_at,
                    location: editingMeeting.location
                  })
                  setEditingMeeting(null)
                }
              }}>
                Update Meeting
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add New Contact</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingContact(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="contact-name">Name *</Label>
                <Input
                  id="contact-name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter contact name..."
                />
              </div>

              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="contact-company">Company</Label>
                <Input
                  id="contact-company"
                  value={contactForm.company}
                  onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                />
              </div>

              <div>
                <Label htmlFor="contact-role">Role</Label>
                <Input
                  id="contact-role"
                  value={contactForm.role}
                  onChange={(e) => setContactForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Job title"
                />
              </div>

              <div>
                <Label htmlFor="contact-notes">Notes</Label>
                <Textarea
                  id="contact-notes"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this contact..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setIsAddingContact(false)}>
                Cancel
              </Button>
              <Button onClick={addContact}>
                Add Contact
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Contact</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingContact(null)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              {(() => {
                const contactData = parseContactData(editingContact)
                return (
                  <>
                    <div>
                      <Label htmlFor="edit-name">Name *</Label>
                      <Input
                        id="edit-name"
                        value={contactData.name}
                        onChange={(e) => {
                          const newTitle = `CONTACT: ${e.target.value}`
                          setEditingContact(prev => prev ? { ...prev, title: newTitle } : null)
                        }}
                        placeholder="Enter contact name..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={contactData.email}
                        onChange={(e) => {
                          const content = editingContact.content_md || ''
                          const newContent = content.replace(/Email: .+/gi, `Email: ${e.target.value}`)
                          setEditingContact(prev => prev ? { ...prev, content_md: newContent.includes('Email:') ? newContent : `Email: ${e.target.value}\n${content}` } : null)
                        }}
                        placeholder="john@company.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={contactData.phone}
                        onChange={(e) => {
                          const content = editingContact.content_md || ''
                          const newContent = content.replace(/Phone: .+/gi, `Phone: ${e.target.value}`)
                          setEditingContact(prev => prev ? { ...prev, content_md: newContent.includes('Phone:') ? newContent : `Phone: ${e.target.value}\n${content}` } : null)
                        }}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-company">Company</Label>
                      <Input
                        id="edit-company"
                        value={contactData.company}
                        onChange={(e) => {
                          const content = editingContact.content_md || ''
                          const newContent = content.replace(/Company: .+/gi, `Company: ${e.target.value}`)
                          setEditingContact(prev => prev ? { ...prev, content_md: newContent.includes('Company:') ? newContent : `Company: ${e.target.value}\n${content}` } : null)
                        }}
                        placeholder="Company name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-role">Role</Label>
                      <Input
                        id="edit-role"
                        value={contactData.role}
                        onChange={(e) => {
                          const content = editingContact.content_md || ''
                          const newContent = content.replace(/Role: .+/gi, `Role: ${e.target.value}`)
                          setEditingContact(prev => prev ? { ...prev, content_md: newContent.includes('Role:') ? newContent : `Role: ${e.target.value}\n${content}` } : null)
                        }}
                        placeholder="Job title"
                      />
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setEditingContact(null)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                if (editingContact) {
                  try {
                    const { data, error } = await supabase
                      .from('notes')
                      .update({
                        title: editingContact.title,
                        content_md: editingContact.content_md
                      })
                      .eq('id', editingContact.id)
                      .select()
                      .single()

                    if (error) throw error

                    setContacts(prev => prev.map(contact => 
                      contact.id === editingContact.id ? data : contact
                    ))
                    setEditingContact(null)
                    toast.success('Contact updated!')
                  } catch (error) {
                    console.error('Error updating contact:', error)
                    toast.error('Failed to update contact')
                  }
                }
              }}>
                Update Contact
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedMeeting.title}</h2>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(getMeetingStatus(selectedMeeting))}>
                  {getMeetingStatus(selectedMeeting)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMeeting(null)}>
                  ×
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Date & Time</Label>
                  <p className="text-sm">
                    {formatMeetingTime(selectedMeeting.start_at)} - {format(parseISO(selectedMeeting.end_at), 'h:mm a')}
                  </p>
                  <p className="text-xs text-gray-500">Duration: {getDuration(selectedMeeting.start_at, selectedMeeting.end_at)}</p>
                </div>

                {selectedMeeting.location && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Location</Label>
                    <p className="text-sm flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {selectedMeeting.location}
                    </p>
                  </div>
                )}
              </div>

              {selectedMeeting.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {selectedMeeting.description}
                    </pre>
                  </div>
                </div>
              )}
              {(() => {
                const agendaText = parseMeetingDescription(selectedMeeting.description || '').agenda
                if (!agendaText) return null
                const items = agendaText.split('\n').map(i => i.replace(/^•\s*/, '').trim()).filter(Boolean)
                return (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Agenda</Label>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      {items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700">Quick Actions</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => startVideoCall(selectedMeeting)}>
                    <Video className="h-4 w-4 mr-1" />
                    Join Video
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => makePhoneCall(selectedMeeting)}>
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => sendEmail(selectedMeeting)}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadICS(selectedMeeting)}>
                    <Download className="h-4 w-4 mr-1" />
                    Add to Calendar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyMeetingLink(selectedMeeting)}>
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setEditingMeeting(selectedMeeting)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => {
                deleteMeeting(selectedMeeting.id)
                setSelectedMeeting(null)
              }}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button onClick={() => setSelectedMeeting(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}