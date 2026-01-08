import { useState } from 'react';
import { FiShield, FiLock, FiAlertTriangle } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminSecurity() {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    passwordPolicy: 'medium',
    sessionTimeout: 30,
    ipWhitelist: [] as string[],
    auditLogging: true
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiShield className="h-8 w-8 text-gray-700" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Security</h2>
          <p className="text-sm text-gray-500">System security settings and policies</p>
        </div>
      </div>

      <Alert>
        <FiAlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Security settings are highly sensitive. Changes here affect the entire system.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="authentication" className="space-y-4">
        <TabsList>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Settings</CardTitle>
              <CardDescription>Configure authentication methods and policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                </div>
                <Button variant={securitySettings.twoFactorEnabled ? 'default' : 'outline'}>
                  {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Password Policy</p>
                  <p className="text-sm text-gray-500">Set password strength requirements</p>
                </div>
                <select
                  value={securitySettings.passwordPolicy}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordPolicy: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-gray-500">Automatic logout after inactivity (minutes)</p>
                </div>
                <Input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Manage IP whitelisting and access restrictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">IP Whitelist</p>
                  <p className="text-sm text-muted-foreground mb-4">Restrict access to specific IP addresses</p>
                  <div className="space-y-2">
                    {securitySettings.ipWhitelist.length === 0 ? (
                      <p className="text-sm text-gray-500">No IP addresses whitelisted</p>
                    ) : (
                      securitySettings.ipWhitelist.map((ip, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                          <span className="text-sm">{ip}</span>
                          <Button variant="ghost" size="sm">Remove</Button>
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="outline" className="mt-2">Add IP Address</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encryption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encryption Settings</CardTitle>
              <CardDescription>Manage encryption keys and certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Encryption</p>
                    <p className="text-sm text-gray-500">Encryption status for sensitive data</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400">
                    <FiLock className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Key Rotation</p>
                    <p className="text-sm text-gray-500">Last rotated: Never</p>
                  </div>
                  <Button variant="outline">Rotate Keys</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logging</CardTitle>
              <CardDescription>Track all security-related events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">Audit Logging</p>
                  <p className="text-sm text-gray-500">Log all security events and access attempts</p>
                </div>
                <Button variant={securitySettings.auditLogging ? 'default' : 'outline'}>
                  {securitySettings.auditLogging ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Audit logs are stored securely and cannot be modified. View logs in the Logs section.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
