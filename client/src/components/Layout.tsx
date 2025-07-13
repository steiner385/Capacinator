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
  Palette,
  History,
  GanttChart,
  LogOut,
  User,
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
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
  { name: 'Import', href: '/import', icon: FileSpreadsheet },
  { name: 'Audit Log', href: '/audit-log', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentUser, logout } = useUser();

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <img src="/capacinator_inator_transparent_logo.png" alt="Capacinator" className="logo-icon" />
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
          {currentUser && (
            <div className="user-info">
              <div className="user-details">
                <User className="user-icon" size={16} />
                <div className="user-name">{currentUser.name}</div>
              </div>
              <button 
                onClick={logout} 
                className="logout-button"
                title="Switch User"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
          <div className="version">v1.0.0</div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}