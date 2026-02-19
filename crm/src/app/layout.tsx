import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CRM South Lab Tech',
  description: 'Gestão de leads e pipeline de vendas',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let perfil: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    perfil = data
  }

  const isAuthPage = !user

  return (
    <html lang="pt">
      <body className={`${geist.variable} font-sans antialiased`}>
        <TooltipProvider>
          {isAuthPage ? (
            children
          ) : (
            <div className="min-h-screen bg-background">
              <Sidebar perfil={perfil} />
              <main className="lg:pl-56 pt-14 lg:pt-0 min-h-screen">
                <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          )}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
