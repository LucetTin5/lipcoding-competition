import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserCheck, MessageSquare, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios-instance';

const DashboardPage = ({ user }) => {
  const [stats, setStats] = useState({
    totalMatches: 0,
    pendingRequests: 0,
    acceptedMatches: 0,
  });
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const matchesResponse = await axiosInstance.get('/matches');
      const matches = matchesResponse.data;

      setRecentMatches(matches.slice(0, 5));

      const pending = matches.filter((m) => m.status === 'pending').length;
      const accepted = matches.filter((m) => m.status === 'accepted').length;

      setStats({
        totalMatches: matches.length,
        pendingRequests: pending,
        acceptedMatches: accepted,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'default',
      accepted: 'default',
      rejected: 'destructive',
    };

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.name}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your{' '}
            {user.role === 'mentor' ? 'mentorship' : 'learning'} journey.
          </p>
        </div>

        <div className="flex gap-2">
          {user.role === 'mentee' && (
            <Button asChild>
              <Link to="/mentors">Find Mentors</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/profile">Edit Profile</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground">
              {user.role === 'mentor' ? 'Requests received' : 'Requests sent'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Waiting for response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Matches
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptedMatches}</div>
            <p className="text-xs text-muted-foreground">Currently matched</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest{' '}
            {user.role === 'mentor'
              ? 'mentorship requests'
              : 'matching requests'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentMatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">
                {user.role === 'mentor'
                  ? 'Mentee requests will appear here'
                  : 'Start by finding a mentor to connect with'}
              </p>
              {user.role === 'mentee' && (
                <Button className="mt-4" asChild>
                  <Link to="/mentors">Browse Mentors</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      {user.role === 'mentor'
                        ? match.mentee?.name?.charAt(0)?.toUpperCase()
                        : match.mentor?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.role === 'mentor'
                          ? match.mentee?.name
                          : match.mentor?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.message || 'No message provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(match.status)}
                    <p className="text-sm text-muted-foreground">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              <div className="text-center pt-4">
                <Button variant="outline" asChild>
                  <Link to="/matches">View All</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
