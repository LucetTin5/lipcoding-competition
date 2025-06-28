import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isAuthenticated, getUserFromToken } from './utils/auth';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import MentorsPage from './pages/MentorsPage';
import MatchesPage from './pages/MatchesPage';

// Components
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUserFromToken());
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        {user && <Navbar user={user} setUser={setUser} />}

        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage setUser={setUser} />
              )
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/dashboard" replace /> : <SignupPage />
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              user ? (
                <DashboardPage user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/mentors"
            element={
              user && user.role === 'mentee' ? (
                <MentorsPage user={user} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/matches"
            element={
              user ? (
                <MatchesPage user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
