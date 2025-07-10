import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectNew } from './pages/ProjectNew';
import People from './pages/People';
import PersonDetails from './pages/PersonDetails';
import { PersonNew } from './pages/PersonNew';
import Roles from './pages/Roles';
import ProjectTypes from './pages/ProjectTypes';
import Assignments from './pages/Assignments';
import { AssignmentNew } from './pages/AssignmentNew';
import Allocations from './pages/Allocations';
import Availability from './pages/Availability';
import Reports from './pages/Reports';
import Import from './pages/Import';
import Settings from './pages/Settings';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/new" element={<PersonNew />} />
            <Route path="/people/:id" element={<PersonDetails />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/project-types" element={<ProjectTypes />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/assignments/new" element={<AssignmentNew />} />
            <Route path="/allocations" element={<Allocations />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

export default App;
