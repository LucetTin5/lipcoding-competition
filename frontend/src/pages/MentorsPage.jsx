import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Search, Filter, MessageSquare } from 'lucide-react';
import axiosInstance from '../api/axios-instance';

const MentorsPage = ({ user }) => {
  const [mentors, setMentors] = useState([]);
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Request modal state
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  useEffect(() => {
    fetchMentors();
  }, []);

  useEffect(() => {
    filterAndSortMentors();
  }, [mentors, searchTerm, techFilter, sortBy, sortOrder]);

  const fetchMentors = async () => {
    try {
      const response = await axiosInstance.get('/mentors', {
        params: {
          search: searchTerm,
          tech_stack: techFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
      });
      setMentors(response.data);
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMentors = () => {
    let filtered = [...mentors];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (mentor) =>
          mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mentor.techStack.some((tech) =>
            tech.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Apply tech stack filter
    if (techFilter) {
      filtered = filtered.filter((mentor) =>
        mentor.techStack.some((tech) =>
          tech.toLowerCase().includes(techFilter.toLowerCase())
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'tech_stack') {
        const aStack = a.techStack.join(', ');
        const bStack = b.techStack.join(', ');
        comparison = aStack.localeCompare(bStack);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredMentors(filtered);
  };

  const handleSendRequest = async () => {
    setSendingRequest(true);
    setRequestError('');
    setRequestSuccess('');

    try {
      await axiosInstance.post('/matches', {
        mentorId: selectedMentor.id,
        message: requestMessage,
      });

      setRequestSuccess('Request sent successfully!');
      setRequestMessage('');
      setTimeout(() => {
        setSelectedMentor(null);
        setRequestSuccess('');
      }, 2000);
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading mentors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find Mentors</h1>
          <p className="text-muted-foreground">
            Connect with experienced mentors in your field
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search mentors or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="techFilter">Tech Stack</Label>
              <Input
                id="techFilter"
                placeholder="Filter by technology..."
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="tech_stack">Tech Stack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Order</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mentors Grid */}
      {filteredMentors.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No mentors found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={mentor.profileImage} alt={mentor.name} />
                    <AvatarFallback>
                      {mentor.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{mentor.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {mentor.techStack.slice(0, 2).join(', ')}
                      {mentor.techStack.length > 2 &&
                        ` +${mentor.techStack.length - 2} more`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {mentor.bio || 'No bio available'}
                </p>

                <div className="flex flex-wrap gap-1">
                  {mentor.techStack.slice(0, 4).map((tech, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {mentor.techStack.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{mentor.techStack.length - 4}
                    </Badge>
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedMentor(mentor);
                        setRequestMessage('');
                        setRequestError('');
                        setRequestSuccess('');
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Mentorship Request</DialogTitle>
                      <DialogDescription>
                        Send a request to {mentor.name} to become your mentor
                      </DialogDescription>
                    </DialogHeader>

                    {requestError && (
                      <Alert variant="destructive">
                        <AlertDescription>{requestError}</AlertDescription>
                      </Alert>
                    )}

                    {requestSuccess && (
                      <Alert>
                        <AlertDescription>{requestSuccess}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                        <Avatar>
                          <AvatarImage
                            src={mentor.profileImage}
                            alt={mentor.name}
                          />
                          <AvatarFallback>
                            {mentor.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{mentor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {mentor.techStack.slice(0, 3).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message (Optional)</Label>
                        <Textarea
                          id="message"
                          placeholder="Tell them why you'd like them as a mentor and what you hope to learn..."
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="submit"
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                      >
                        {sendingRequest ? 'Sending...' : 'Send Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentorsPage;
