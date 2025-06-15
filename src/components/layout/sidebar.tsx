'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  ShoppingCart,
  CheckSquare,
  Users,
  Calendar,
  FolderOpen,
  FileText,
  BookOpen,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: '#6366f1'
  },
  {
    name: 'School',
    href: '/dashboard/school',
    icon: GraduationCap,
    color: '#10b981'
  },
  {
    name: 'Work',
    href: '/dashboard/work',
    icon: Briefcase,
    color: '#f59e0b'
  },
  {
    name: 'Shopping',
    href: '/dashboard/shopping',
    icon: ShoppingCart,
    color: '#ef4444'
  },
  {
    name: 'Tasks',
    href: '/dashboard/tasks',
    icon: CheckSquare,
    color: '#8b5cf6'
  },
  {
    name: 'Social',
    href: '/dashboard/social',
    icon: Users,
    color: '#ec4899'
  },
  {
    name: 'Meetings',
    href: '/dashboard/meetings',
    icon: Calendar,
    color: '#06b6d4'
  },
  {
    name: 'Projects',
    href: '/dashboard/projects',
    icon: FolderOpen,
    color: '#84cc16'
  },
  {
    name: 'Notes',
    href: '/dashboard/notes',
    icon: FileText,
    color: '#f97316'
  },
  {
    name: 'Diary',
    href: '/dashboard/diary',
    icon: BookOpen,
    color: '#64748b'
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const handleQuickAdd = () => {
    // Focus on the quick add bar in the dashboard
    const quickAddInput = document.querySelector('input[placeholder*="quick"], input[placeholder*="add"]') as HTMLInputElement
    if (quickAddInput) {
      quickAddInput.focus()
      quickAddInput.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
    toast.success('Quick add bar focused!')
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const userName = user?.email?.split('@')[0] || 'User'

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-bold text-lg text-gray-900">Life Manager</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Life Manager</h1>
              <p className="text-xs text-gray-500">Personal Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.name} href={item.href} onClick={closeMobileMenu}>
                <div
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  {item.name === 'Tasks' && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      3
                    </Badge>
                  )}
                  {item.name === 'Shopping' && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      !
                    </Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-200">
          <Button size="sm" className="w-full mb-3" onClick={handleQuickAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2"
              title="Toggle dark mode (coming soon)"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              title="Settings (coming soon)"
              onClick={() => toast.info('Settings page coming soon!')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <div
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-white text-sm">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </div>

          {isProfileOpen && (
            <div className="mt-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => {
                  toast.info('Profile settings coming soon!')
                  closeMobileMenu()
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
