# Personal Life Manager

A comprehensive, enterprise-grade personal productivity platform built with Next.js, TypeScript, and Supabase. Manage every aspect of your life from tasks and projects to diary entries and social connections - all in one beautifully designed, fully functional application.

![Personal Life Manager](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)

## 🌟 Features

### 9 Comprehensive Life Management Categories

- **📊 Dashboard** - Centralized overview with today's tasks, upcoming events, and category statistics
- **📖 Diary** - Daily journaling with mood tracking, writing prompts, and streak monitoring
- **📝 Notes** - Advanced note-taking with markdown support, templates, and search
- **🛒 Shopping** - Smart shopping lists with supplement tracking and inventory management
- **✅ Tasks** - Comprehensive task management with priorities, categories, and filtering
- **💼 Work** - Professional work management with time tracking and project oversight
- **🎓 School** - Academic management with courses, assignments, and grade tracking
- **👥 Social** - Contact management, event planning, and relationship tracking
- **🤝 Meetings** - Professional meeting scheduling with templates and contact integration
- **📋 Projects** - Enterprise-grade project management with kanban boards and analytics

### Core Capabilities

- **🔐 Secure Authentication** - Supabase-powered authentication with protected routes
- **🔍 Real-time Search** - Advanced search and filtering across all data types
- **📱 Responsive Design** - Beautiful, mobile-optimized interface
- **⚡ Real-time Updates** - Live data synchronization across all features
- **🎨 Professional UI** - Built with shadcn/ui components and Tailwind CSS
- **📊 Analytics & Insights** - Progress tracking and productivity analytics
- **🔄 Full CRUD Operations** - Complete create, read, update, delete functionality
- **💾 Automatic Saving** - Real-time data persistence with error handling

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/personal-life-manager.git
   cd personal-life-manager
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Set up Supabase**
   - Create tables using the provided SQL schema
   - Set up Row Level Security (RLS) policies
   - Configure authentication settings

5. **Run the development server**
   ```bash
   bun dev
   # or
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Getting Started
personal-life-manager/
├── src/
│ ├── app/ # Next.js App Router pages
│ │ ├── auth/ # Authentication pages
│ │ ├── dashboard/ # Main application pages
│ │ └── globals.css # Global styles
│ ├── components/ # React components
│ │ ├── dashboard/ # Dashboard-specific components
│ │ ├── diary/ # Diary page components
│ │ ├── layout/ # Layout components (sidebar, etc.)
│ │ ├── ui/ # shadcn/ui components
│ │ └── [category]/ # Category-specific components
│ └── lib/ # Utilities and configurations
│ ├── supabase/ # Supabase client configuration
│ ├── auth-server.ts # Server-side auth helpers
│ └── utils.ts # Utility functions
├── public/ # Static assets
├── .same/ # Project documentation
│ └── todos.md # Development roadmap
└── docs/ # Additional documentation
├── .same/ # Project documentation
│ └── todos.md # Development roadmap
└── docs/ # Additional documentation
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Lucide React** - Beautiful icons
- **date-fns** - Date manipulation library

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Authentication & authorization

### Development Tools
- **Biome** - Fast formatter and linter
- **ESLint** - Code linting
- **TypeScript** - Static type checking

### Deployment
- **Netlify** - Hosting and continuous deployment
- **GitHub** - Version control and CI/CD

## 🔧 Available Scripts

```bash
# Development
bun dev          # Start development server with Turbopack
npm run dev      # Alternative with npm

# Building & Production
bun run build    # Build for production
npm run build    # Alternative with npm
bun start        # Start production server
npm start        # Alternative with npm

# Code Quality
bun run lint     # Run Biome linter and TypeScript checks
bun run format   # Format code with Biome
```

## 🔐 Authentication

The application uses Supabase Authentication with:
- Email/password authentication
- Protected routes with middleware
- Server-side and client-side auth helpers
- Automatic session management
- Secure cookie handling

## 💾 Database Schema

The application uses a comprehensive Supabase database schema with:
- **Users** - User profiles and preferences
- **Categories** - Life management categories
- **Tasks** - Task management with priorities and due dates
- **Events** - Calendar events and meetings
- **Notes** - Markdown-supported note-taking
- **Projects** - Project management with tasks
- **Diary Entries** - Daily journaling
- **Supplement Items** - Health supplement tracking
- **Row Level Security** - User data isolation

## 🌐 Deployment

### Netlify (Current)
The project is configured for automatic deployment on Netlify:
- Connected to GitHub for continuous deployment
- Environment variables configured in Netlify dashboard
- Build command: `bun install && SKIP_ENV_VALIDATION=true npx next build`

### Manual Deployment
1. Build the project: `bun run build`
2. Deploy the `.next` folder to your hosting provider
3. Set up environment variables
4. Configure redirects for client-side routing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use meaningful commit messages
- Maintain component separation (server/client)
- Write comprehensive error handling
- Test all CRUD operations

## 📚 Documentation

- [Development Roadmap](.same/todos.md) - Detailed development progress and future plans
- [Codebase Guide](CODEBASE.md) - Comprehensive codebase documentation
- [Component Architecture](docs/components.md) - Component design patterns
- [Database Schema](docs/database.md) - Database structure and relationships

## 🐛 Issues & Support

If you encounter any issues or have questions:
1. Check the [documentation](docs/)
2. Search existing [GitHub Issues](https://github.com/yourusername/personal-life-manager/issues)
3. Create a new issue with detailed information

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database and auth by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- Originally scaffolded with [same.new](https://same.new/)

---

**Personal Life Manager** - Transform your productivity with enterprise-grade life management tools. 🚀✨