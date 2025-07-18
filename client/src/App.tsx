import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { UserProvider, useUser } from './contexts/UserContext';
import { WizardProvider } from './contexts/WizardContext';
import { ScenarioProvider } from './contexts/ScenarioContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectNew } from './pages/ProjectNew';
import People from './pages/People';
import PersonDetails from './pages/PersonDetails';
import { PersonNew } from './pages/PersonNew';
import Roles from './pages/Roles';
import RoleDetails from './pages/RoleDetails';
import ProjectTypes from './pages/ProjectTypes';
import ProjectTypeDetails from './pages/ProjectTypeDetails';
import ProjectRoadmap from './pages/ProjectRoadmap';
import ProjectsUnified from './pages/ProjectsUnified';
import PeopleUnified from './pages/PeopleUnified';
import Assignments from './pages/Assignments';
import { Scenarios } from './pages/Scenarios';
import { AssignmentNew } from './pages/AssignmentNew';
import { AllocationWizard } from './pages/AllocationWizard';
import Availability from './pages/Availability';
import { AuditLog } from './pages/AuditLog';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { Locations } from './pages/Locations';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsUnified />} />
        <Route path="/projects/new" element={<ProjectNew />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/roadmap" element={<Navigate to="/projects?tab=roadmap" replace />} />
        <Route path="/people" element={<PeopleUnified />} />
        <Route path="/people/new" element={<PersonNew />} />
        <Route path="/people/:id" element={<PersonDetails />} />
        <Route path="/roles" element={<Navigate to="/people" replace />} />
        <Route path="/roles/:id" element={<RoleDetails />} />
        <Route path="/resource-templates" element={<Navigate to="/people" replace />} />
        <Route path="/allocations" element={<Navigate to="/people" replace />} />
        <Route path="/project-types" element={<Navigate to="/projects" replace />} />
        <Route path="/project-types/:id" element={<ProjectTypeDetails />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/assignments/new" element={<AssignmentNew />} />
        <Route path="/wizard" element={<AllocationWizard />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/availability" element={<Navigate to="/people" replace />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <ScenarioProvider>
            <WizardProvider>
              <Router>
                <AppContent />
              </Router>
            </WizardProvider>
          </ScenarioProvider>
        </UserProvider>
      </ThemeProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

export default App;
