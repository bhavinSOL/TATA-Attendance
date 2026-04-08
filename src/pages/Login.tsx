import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, User, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Login = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'select' | 'admin-password'>('select');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleUserLogin = () => {
    login('user');
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login('admin', password);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">T</span>
          </div>
          <h1 className="text-2xl font-bold">TATA Motors</h1>
          <p className="text-muted-foreground">Attendance Insights Portal</p>
        </div>

        {mode === 'select' ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Select your role to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4 text-left"
                onClick={handleUserLogin}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">Employee / Viewer</div>
                  <div className="text-xs text-muted-foreground">View dashboard, predictions & download reports</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4 text-left"
                onClick={() => setMode('admin-password')}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium">HR Admin</div>
                  <div className="text-xs text-muted-foreground">Full access — edit data, manage calendar & settings</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Lock className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>Enter the admin password to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={error ? 'border-red-500' : ''}
                    autoFocus
                  />
                  {error && <p className="text-sm text-red-500">Incorrect password. Try again.</p>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setMode('select'); setPassword(''); setError(false); }}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    <Lock className="mr-2 h-4 w-4" />
                    Login as Admin
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;
