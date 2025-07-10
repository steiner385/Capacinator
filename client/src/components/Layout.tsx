import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Settings,
  GitBranch,
  ClipboardList,
  Activity,
  Palette,
} from 'lucide-react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Roles', href: '/roles', icon: UserCog },
  { name: 'Project Types', href: '/project-types', icon: Palette },
  { name: 'Assignments', href: '/assignments', icon: ClipboardList },
  { name: 'Resource Templates', href: '/allocations', icon: GitBranch },
  { name: 'Availability', href: '/availability', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Import', href: '/import', icon: FileSpreadsheet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <Activity className="logo-icon" />
          <div className="logo-text">Capacinator</div>
        </div>
        
        <ul className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon;
            // const isActive = location.pathname.startsWith(item.href);
            
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon className="nav-icon" size={20} />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <div className="version">v1.0.0</div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}