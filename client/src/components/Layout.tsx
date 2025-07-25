import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  Calendar,
  BarChart3,
  Settings,
  GitBranch,
  ClipboardList,
  Palette,
  History,
  GanttChart,
  MapPin,
} from 'lucide-react';
import { AppHeader } from './AppHeader';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Assignments', href: '/assignments', icon: ClipboardList },
  { name: 'Scenarios', href: '/scenarios', icon: GitBranch },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Audit Log', href: '/audit-log', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout">
      <AppHeader />
      
      <div className="layout-body">
        <nav className="sidebar">
          <div className="sidebar-header">
            <img src="/capacinator_inator_transparent_logo.png" alt="Capacinator" className="logo-icon" />
            <div className="logo-text">Capacinator</div>
          </div>
          
          <ul className="nav-list">
            {navigation.map((item) => {
              const Icon = item.icon;
              
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
    </div>
  );
}