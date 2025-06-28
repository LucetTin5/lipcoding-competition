import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Check,
  X,
  MessageSquare,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import axiosInstance from '../api/axios-instance';

const MatchesPage = ({ user }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      let response;
      if (user.role === 'mentor') {
        response = await axiosInstance.get('/match-requests/incoming');
      } else {
        response = await axiosInstance.get('/match-requests/outgoing');
      }
      setMatches(response.data);
    } catch (error) {
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMatch = async (matchId, status) => {
    setActionLoading(matchId);
    setError('');
    setSuccess('');

    try {
      let response;
      if (status === 'accepted') {
        response = await axiosInstance.put(`/match-requests/${matchId}/accept`);
      } else if (status === 'rejected') {
        response = await axiosInstance.put(`/match-requests/${matchId}/reject`);
      }

      // Update local state
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? { ...match, status, updatedAt: new Date().toISOString() }
            : match
        )
      );

      setSuccess(`Request ${status} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${status} request`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    setActionLoading(matchId);
    setError('');
    setSuccess('');

    try {
      await axiosInstance.delete(`/match-requests/${matchId}`);

      // Remove from local state
      setMatches((prev) => prev.filter((match) => match.id !== matchId));

      setSuccess('Request deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete request');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
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

  const groupedMatches = {
    pending: matches.filter((m) => m.status === 'pending'),
    accepted: matches.filter((m) => m.status === 'accepted'),
    rejected: matches.filter((m) => m.status === 'rejected'),
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading matches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user.role === 'mentor' ? 'Mentorship Requests' : 'My Requests'}
          </h1>
          <p className="text-muted-foreground">
            {user.role === 'mentor'
              ? 'Manage incoming mentorship requests'
              : 'Track your mentorship applications'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({groupedMatches.pending.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Accepted ({groupedMatches.accepted.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({groupedMatches.rejected.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedMatches).map(([status, statusMatches]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {statusMatches.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-muted-foreground">
                    {getStatusIcon(status)}
                    <p className="text-lg font-medium mt-4">
                      No {status} requests
                    </p>
                    <p className="text-sm">
                      {status === 'pending' &&
                        user.role === 'mentee' &&
                        'Send requests to mentors to get started'}
                      {status === 'pending' &&
                        user.role === 'mentor' &&
                        'New requests will appear here'}
                      {status === 'accepted' &&
                        'Accepted matches will appear here'}
                      {status === 'rejected' &&
                        'Rejected requests will appear here'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {statusMatches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={
                                user.role === 'mentor'
                                  ? match.mentee?.profileImage
                                  : match.mentor?.profileImage
                              }
                              alt={
                                user.role === 'mentor'
                                  ? match.mentee?.name
                                  : match.mentor?.name
                              }
                            />
                            <AvatarFallback>
                              {(user.role === 'mentor'
                                ? match.mentee?.name
                                : match.mentor?.name
                              )
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-2">
                            <div>
                              <h3 className="font-medium">
                                {user.role === 'mentor'
                                  ? match.mentee?.name
                                  : match.mentor?.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {user.role === 'mentor'
                                  ? match.mentee?.email
                                  : match.mentor?.email}
                              </p>
                            </div>

                            {match.message && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Message:</p>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                  {match.message}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                Sent{' '}
                                {match.createdAt
                                  ? new Date(
                                      match.createdAt
                                    ).toLocaleDateString()
                                  : 'Unknown date'}
                              </span>
                              {match.updatedAt &&
                                match.updatedAt !== match.createdAt && (
                                  <span>
                                    Updated{' '}
                                    {new Date(
                                      match.updatedAt
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(match.status)}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        {user.role === 'mentor' &&
                          match.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateMatch(match.id, 'accepted')
                                }
                                disabled={actionLoading === match.id}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleUpdateMatch(match.id, 'rejected')
                                }
                                disabled={actionLoading === match.id}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}

                        {/* Delete button for mentees or for mentors on rejected requests */}
                        {(user.role === 'mentee' ||
                          (user.role === 'mentor' &&
                            match.status === 'rejected')) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Request</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this request?
                                  This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeleteMatch(match.id)}
                                  disabled={actionLoading === match.id}
                                >
                                  {actionLoading === match.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MatchesPage;
