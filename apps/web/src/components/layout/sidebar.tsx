'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  FolderOpen,
  IndianRupee,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { UserRole } from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Community',
    items: [
      { href: '/members', label: 'Members', icon: Users },
      { href: '/events', label: 'Events', icon: Calendar },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/payments', label: 'Payments', icon: CreditCard },
      { href: '/expenses', label: 'Expenses', icon: Receipt },
      { href: '/income', label: 'Income', icon: TrendingUp },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/documents', label: 'Documents', icon: FolderOpen },
      { href: '/notifications', label: 'Notifications', icon: FileText },
      {
        href: '/audit-logs',
        label: 'Audit Logs',
        icon: ScrollText,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
      {
        href: '/admins',
        label: 'Admins',
        icon: Shield,
        roles: [UserRole.SUPER_ADMIN],
      },
      {
        href: '/settings',
        label: 'Settings',
        icon: Settings,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
    ],
  },
];

export function SidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b px-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <IndianRupee className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">Community Finance</p>
      </div>
    </div>
  );
}

/** Navigation links — shared by the desktop rail and the mobile drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const visible = section.items.filter(
          (item) => !item.roles || (user && item.roles.includes(user.role))
        );
        if (visible.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {visible.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/** Desktop rail — hidden below lg; mobile uses the drawer in the header. */
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}
