import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { X, Plus } from 'lucide-react';
import axiosInstance from '../api/axios-instance';
import { getUserFromToken, setToken } from '../utils/auth';

const ProfilePage = ({ user, setUser }) => {
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    profileImage: '',
    techStack: [],
  });
  const [newTech, setNewTech] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/me');
      setProfile(response.data);
    } catch (error) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const addTechStack = (e) => {
    e.preventDefault();
    if (newTech.trim() && !profile.techStack.includes(newTech.trim())) {
      setProfile((prev) => ({
        ...prev,
        techStack: [...prev.techStack, newTech.trim()],
      }));
      setNewTech('');
    }
  };

  const removeTechStack = (tech) => {
    setProfile((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((t) => t !== tech),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await axiosInstance.put('/profile', profile);
      setProfile(response.data);

      // Update user in local state if name changed
      if (profile.name !== user.name) {
        setUser((prev) => ({ ...prev, name: profile.name }));
      }

      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information and preferences
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
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

            {/* Profile Image */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.profileImage} alt={profile.name} />
                <AvatarFallback className="text-lg">
                  {profile.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="profileImage">Profile Image URL</Label>
                <Input
                  id="profileImage"
                  name="profileImage"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={profile.profileImage}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your profile image
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  placeholder={
                    user.role === 'mentor'
                      ? 'Tell potential mentees about your experience, expertise, and what you can help them with...'
                      : "Tell potential mentors about yourself, your goals, and what you're looking to learn..."
                  }
                  value={profile.bio}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
            </div>

            {/* Tech Stack (Mentors only) */}
            {user.role === 'mentor' && (
              <div className="space-y-4">
                <div>
                  <Label>Technical Skills</Label>
                  <p className="text-sm text-muted-foreground">
                    Add technologies and skills you can mentor in
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.techStack.map((tech, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tech}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeTechStack(tech)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill (e.g., React, Python, Design)"
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTechStack(e);
                      }
                    }}
                  />
                  <Button type="button" onClick={addTechStack} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* User Info (Read-only) */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-medium">Account Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <div className="flex justify-end gap-4 p-6 pt-0">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
