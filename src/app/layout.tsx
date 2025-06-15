import { requireAuth } from '@/lib/auth-server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is authenticated
  await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="transition-all duration-300 ease-in-out lg:ml-64">
        <div className="lg:hidden">
          {/* Mobile header spacer */}
          <div className="h-16"></div>
        </div>
        {children}
      </main>
    </div>
  )
}
