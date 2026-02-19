'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  Users,
  CheckSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn, getIniciais } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', Icon: Kanban },
  { href: '/leads', label: 'Leads', Icon: Users },
  { href: '/tarefas', label: 'Tarefas', Icon: CheckSquare },
]

interface SidebarProps {
  perfil: Profile | null
}

export function Sidebar({ perfil }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileAberto, setMobileAberto] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavLinks = () => (
    <nav className="flex-1 space-y-1 px-2">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const activo = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileAberto(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activo
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const UserSection = () => (
    <div className="px-2 pb-4 space-y-3">
      <Separator />
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getIniciais(perfil?.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{perfil?.nome ?? '—'}</p>
          <p className="text-xs text-muted-foreground capitalize">{perfil?.papel ?? ''}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  )

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:border-r bg-background z-30">
        <div className="flex h-16 items-center px-4 border-b">
          <span className="font-bold text-lg">CRM South Lab Tech</span>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto py-4">
          <NavLinks />
        </div>
        <UserSection />
      </aside>

      {/* Header mobile com hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
        <span className="font-bold">CRM South Lab Tech</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileAberto(!mobileAberto)}
        >
          {mobileAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Drawer mobile */}
      {mobileAberto && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/50" onClick={() => setMobileAberto(false)}>
          <aside
            className="fixed left-0 top-14 bottom-0 w-64 bg-background border-r flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col flex-1 overflow-y-auto py-4">
              <NavLinks />
            </div>
            <UserSection />
          </aside>
        </div>
      )}
    </>
  )
}
