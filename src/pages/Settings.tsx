import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/network';

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <Layout>
        <Header title="Settings" />
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Only admins can access settings.</p>
          <Button onClick={() => navigate('/')}>Go Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (oldPassword === newPassword) {
      toast({
        title: 'Error',
        description: 'New password must be different from old password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Call backend to change password
    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccess(true);

        toast({
          title: 'Success',
          description: 'Password changed successfully!',
        });

        // Clear form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to change password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <Layout>
      <Header title="Settings" subtitle="Manage your account settings" />

      <div className="p-4 md:p-8 max-w-2xl">
        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Name</Label>
              <div className="text-lg font-semibold">{user?.name}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <div className="text-lg font-semibold">{user?.email}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Role</Label>
              <div className="text-lg font-semibold capitalize">{user?.role}</div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your admin password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            {showSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Password Updated</h3>
                  <p className="text-sm text-green-800">Your password has been changed successfully.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-password">Current Password</Label>
                <Input
                  id="old-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Password Requirements:</span>
                <ul className="mt-2 space-y-1 ml-2">
                  <li>• At least 6 characters long</li>
                  <li>• Different from your current password</li>
                  <li>• Must match confirmation</li>
                </ul>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
