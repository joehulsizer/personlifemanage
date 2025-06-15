# Personal Life Manager - Codebase Documentation

This document provides a comprehensive guide to the Personal Life Manager codebase, explaining the architecture, patterns, and conventions used throughout the project.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Core Concepts](#core-concepts)
- [Development Patterns](#development-patterns)
- [Database Design](#database-design)
- [Authentication System](#authentication-system)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Styling Approach](#styling-approach)
- [Development Workflow](#development-workflow)

## 🏗️ Project Overview

The Personal Life Manager is a Next.js 15 application built with TypeScript, using the App Router architecture. It provides comprehensive life management across 9 core categories with enterprise-grade functionality.

### Key Technologies
- **Frontend**: Next.js 15, React 18, TypeScript 5.8
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Development**: Biome (formatting/linting), ESLint
- **Deployment**: Netlify with GitHub integration

## 🏛️ Architecture

### Server-Client Component Pattern
The application follows Next.js App Router conventions with a clear separation between server and client components: 
Page (Server Component)
├── Data Fetching
├── Authentication Check
└── PageContent (Client Component)
├── Interactive UI
├── State Management
└── Real-time Updates
├── Interactive UI
├── State Management
└── Real-time Updates

### Example Implementation
```typescript
// app/dashboard/tasks/page.tsx (Server Component)
export default async function TasksPage() {
  const user = await requireAuth()
  const supabase = await createServerClient()
  
  // Server-side data fetching
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
  
  return <TasksPageContent tasks={tasks} user={user} />
}

// components/tasks/tasks-page-content.tsx (Client Component)
'use client'
export function TasksPageContent({ tasks: initialTasks, user }) {
  const [tasks, setTasks] = useState(initialTasks)
  // Interactive functionality here
}
```

## 📁 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── auth/
│   │   └── login/
│   │       └── page.tsx          # Login page
│   │   ├── dashboard/                # Protected app pages
│   │   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   │   ├── page.tsx             # Main dashboard
│   │   │   ├── diary/page.tsx       # Diary management
│   │   │   ├── notes/page.tsx       # Note-taking
│   │   │   ├── shopping/page.tsx    # Shopping & supplements
│   │   │   ├── tasks/page.tsx       # Task management
│   │   │   ├── work/page.tsx        # Work management
│   │   │   ├── school/page.tsx      # Academic management
│   │   │   ├── social/page.tsx      # Social connections
│   │   │   ├── meetings/page.tsx    # Meeting management
│   │   │   └── projects/page.tsx    # Project management
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Landing page
│   ├── components/
│   │   ├── dashboard/               # Dashboard components
│   │   │   ├── today-section.tsx
│   │   │   └── upcoming-section.tsx
│   │   ├── diary/                   # Diary-specific components
│   │   │   └── diary-page-content.tsx
│   │   ├── layout/                  # Layout components
│   │   │   └── sidebar.tsx
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── [category]/              # Category-specific components
│   │       └── [category]-page-content.tsx
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts            # Client-side Supabase client
│       │   ├── server.ts            # Server-side Supabase client
│       │   └── database.types.ts    # Generated TypeScript types
│       ├── auth-server.ts           # Server-side auth utilities
│       ├── auth.ts                  # Client-side auth utilities
│       └── utils.ts                 # Utility functions
├── public/                    # Static assets
├── .same/                     # Project documentation
│   └── todos.md              # Development roadmap
└── docs/                      # Additional documentation
```

## 🧠 Core Concepts

### 1. Server-Side Data Fetching
All initial data is fetched on the server for optimal performance and SEO:

```typescript
// Server component pattern
export default async function Page() {
  const user = await requireAuth()
  const supabase = await createServerClient()
  
  const { data } = await supabase
    .from('table')
    .select('*')
    .eq('user_id', user.id)
  
  return <PageContent data={data} />
}
```

### 2. Client-Side Interactivity
Interactive features are handled in client components:

```typescript
'use client'
export function PageContent({ data: initialData }) {
  const [data, setData] = useState(initialData)
  const supabase = createClient()
  
  const addItem = async () => {
    const { data: newItem } = await supabase
      .from('table')
      .insert(itemData)
      .select()
      .single()
    
    setData(prev => [newItem, ...prev])
  }
  
  return (
    // Interactive UI
  )
}
```

### 3. Authentication Flow
Authentication is handled at multiple layers:

1. **Middleware** (`src/middleware.ts`) - Route protection
2. **Server Utilities** (`lib/auth-server.ts`) - Server-side auth checks
3. **Client Utilities** (`lib/auth.ts`) - Client-side auth helpers

## 🔧 Development Patterns

### 1. CRUD Operation Pattern
Every data interaction follows the same pattern:

```typescript
// Create
const addItem = async () => {
  try {
    const { data, error } = await supabase
      .from('table')
      .insert(itemData)
      .select()
      .single()
    
    if (error) throw error
    setItems(prev => [data, ...prev])
    toast.success('Item added!')
  } catch (error) {
    toast.error('Failed to add item')
  }
}

// Update
const updateItem = async (id: string, updates: Partial<Item>) => {
  try {
    const { data, error } = await supabase
      .from('table')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...data } : item
    ))
    toast.success('Item updated!')
  } catch (error) {
    toast.error('Failed to update item')
  }
}

// Delete
const deleteItem = async (id: string) => {
  if (!confirm('Are you sure?')) return
  
  try {
    const { error } = await supabase
      .from('table')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    setItems(prev => prev.filter(item => item.id !== id))
    toast.success('Item deleted!')
  } catch (error) {
    toast.error('Failed to delete item')
  }
}
```

### 2. Search and Filter Pattern
Search functionality is implemented consistently:

```typescript
const [searchTerm, setSearchTerm] = useState('')
const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')

const filteredData = useMemo(() => {
  return data.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || item.status === selectedFilter
    return matchesSearch && matchesFilter
  })
}, [data, searchTerm, selectedFilter])
```

### 3. Modal Pattern
Modal interactions follow a consistent pattern:

```typescript
const [isModalOpen, setIsModalOpen] = useState(false)
const [editingItem, setEditingItem] = useState<Item | null>(null)

const openModal = (item?: Item) => {
  setEditingItem(item || null)
  setIsModalOpen(true)
}

const closeModal = () => {
  setIsModalOpen(false)
  setEditingItem(null)
}
```

## 🗄️ Database Design

### Core Tables
- **users** - User profiles and authentication
- **categories** - Life management categories (Work, School, etc.)
- **tasks** - Task management with priorities and due dates
- **events** - Calendar events and meetings
- **notes** - Markdown-supported notes
- **projects** - Project management
- **project_tasks** - Tasks within projects
- **diary_entries** - Daily journal entries
- **supplement_items** - Health supplement tracking

### Row Level Security (RLS)
All tables implement RLS policies to ensure user data isolation:

```sql
-- Example RLS policy
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);
```

### Relationships
- Users have many categories, tasks, events, notes, projects
- Projects have many project_tasks
- Categories are linked to tasks, events, notes
- All data is user-scoped through RLS

## 🔐 Authentication System

### Components
1. **Middleware** - Protects routes and handles redirects
2. **Server Helpers** - `requireAuth()` for server components
3. **Client Helpers** - User session management
4. **Login Page** - Email/password authentication

### Implementation
```typescript
// Server-side auth check
export async function requireAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }
  
  return user
}

// Client-side auth usage
const { user, signOut } = useAuth()
```

## 🧩 Component Architecture

### shadcn/ui Integration
The project uses shadcn/ui components as the foundation:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

### Custom Component Patterns
Components follow a consistent structure:

```typescript
interface ComponentProps {
  data: DataType[]
  onAction: (item: DataType) => void
}

export function Component({ data, onAction }: ComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  )
}
```

## 📊 State Management

### Local State Pattern
Each page manages its own state with React hooks:

```typescript
const [items, setItems] = useState<Item[]>(initialItems)
const [isLoading, setIsLoading] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
```

### Real-time Updates
State is updated optimistically with server confirmation:

```typescript
// Optimistic update
setItems(prev => [newItem, ...prev])

// Server operation
const { error } = await supabase.from('table').insert(newItem)

if (error) {
  // Revert on error
  setItems(prev => prev.filter(item => item.id !== newItem.id))
  toast.error('Operation failed')
}
```

## 🎨 Styling Approach

### Tailwind CSS
Utility-first CSS with consistent spacing and colors:

```typescript
<div className="p-4 md:p-8 space-y-6">
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <Button className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <span>Action</span>
      </Button>
    </CardContent>
  </Card>
</div>
```

### Design System
- Consistent spacing: `space-y-6`, `p-4`, `m-2`
- Responsive design: `md:`, `lg:` breakpoints
- Color scheme: Gray-based with accent colors per category
- Icons: Lucide React icons throughout

## 🔄 Development Workflow

### 1. Development Setup
```bash
# Install dependencies
bun install

# Start development server
bun dev

# Code formatting and linting
bun run lint
bun run format
```

### 2. Adding New Features
1. Create server component in `app/` for data fetching
2. Create client component in `components/` for interactivity
3. Add database operations following CRUD patterns
4. Implement search and filtering if needed
5. Add proper error handling and loading states

### 3. Testing Approach
- Manual testing for all CRUD operations
- Error scenario testing (network failures, invalid data)
- Responsive design testing across devices
- Authentication flow testing

### 4. Deployment Process
- Push to GitHub triggers automatic Netlify deployment
- Environment variables configured in Netlify dashboard
- Build process includes TypeScript checking and optimization

## 🛠️ Common Development Tasks

### Adding a New Page
1. Create `app/dashboard/new-page/page.tsx` (server component)
2. Create `components/new-page/new-page-content.tsx` (client component)
3. Add navigation link in `components/layout/sidebar.tsx`
4. Implement data operations following existing patterns

### Adding Database Operations
1. Define TypeScript interfaces for data types
2. Implement CRUD operations with proper error handling
3. Update local state optimistically
4. Add loading states and user feedback

### Debugging Tips
- Check browser console for client-side errors
- Use Supabase dashboard for database inspection
- Check network tab for API request/response issues
- Use React DevTools for component state inspection

## 📝 Code Style Guidelines

### TypeScript
- Use strict mode and proper typing
- Define interfaces for all data types
- Use proper async/await error handling

### React
- Prefer functional components with hooks
- Use proper key props for lists
- Implement proper cleanup in useEffect

### CSS
- Use Tailwind utilities over custom CSS
- Maintain consistent spacing and colors
- Implement responsive design patterns

---

This codebase documentation should serve as your comprehensive guide to understanding and contributing to the Personal Life Manager project. For specific implementation details, refer to the actual code files and their inline comments.

src/
├── app/ # Next.js App Router
│ ├── auth/
│ │ └── login/
│ │ └── page.tsx # Login page
│ ├── dashboard/ # Protected app pages
│ │ ├── layout.tsx # Dashboard layout with sidebar
│ │ ├── page.tsx # Main dashboard
│ │ ├── diary/page.tsx # Diary management
│ │ ├── notes/page.tsx # Note-taking
│ │ ├── shopping/page.tsx # Shopping & supplements
│ │ ├── tasks/page.tsx # Task management
│ │ ├── work/page.tsx # Work management
│ │ ├── school/page.tsx # Academic management
│ │ ├── social/page.tsx # Social connections
│ │ ├── meetings/page.tsx # Meeting management
│ │ └── projects/page.tsx # Project management
│ ├── globals.css # Global styles
│ ├── layout.tsx # Root layout
│ └── page.tsx # Landing page
├── components/
│ ├── dashboard/ # Dashboard components
│ │ ├── today-section.tsx
│ │ └── upcoming-section.tsx
│ ├── diary/ # Diary-specific components
│ │ └── diary-page-content.tsx
│ ├── layout/ # Layout components
│ │ └── sidebar.tsx
│ ├── ui/ # shadcn/ui components
│ │ ├── button.tsx
│ │ ├── card.tsx
│ │ ├── input.tsx
│ │ └── ...
│ └── [category]/ # Category-specific components
│ └── [category]-page-content.tsx
└── lib/
├── supabase/
│ ├── client.ts # Client-side Supabase client
│ ├── server.ts # Server-side Supabase client
│ └── database.types.ts # Generated TypeScript types
├── auth-server.ts # Server-side auth utilities
├── auth.ts # Client-side auth utilities
└── utils.ts # Utility functions
