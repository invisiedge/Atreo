import { useState } from 'react';
import { FiHelpCircle, FiBook, FiVideo, FiMessageSquare, FiSearch } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminHelp() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiHelpCircle className="h-8 w-8 text-gray-700" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Help & Support</h2>
          <p className="text-sm text-gray-500">Documentation, guides, and support resources</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="guides" className="space-y-4">
        <TabsList>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <FiBook className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <CardDescription>Learn the basics of Atreo</CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <FiBook className="h-6 w-6 text-green-600 mb-2" />
                <CardTitle className="text-lg">User Management</CardTitle>
                <CardDescription>Manage users and permissions</CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <FiBook className="h-6 w-6 text-purple-600 mb-2" />
                <CardTitle className="text-lg">Tools & Credentials</CardTitle>
                <CardDescription>Manage tools and credentials</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">How do I add a new user?</h3>
                  <p className="text-sm text-gray-600">
                    Navigate to Management → Users and click "Add User". Fill in the required information and set permissions.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">How are credentials encrypted?</h3>
                  <p className="text-sm text-gray-600">
                    All credentials are encrypted using industry-standard encryption before storage. Access is logged for security auditing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos">
          <Card>
            <CardHeader>
              <CardTitle>Video Tutorials</CardTitle>
              <CardDescription>Step-by-step video guides</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <FiVideo className="h-8 w-8 text-destructive mb-2" />
                  <h3 className="font-medium mb-2">Dashboard Overview</h3>
                  <p className="text-sm text-gray-600">Learn how to navigate and use the dashboard</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <FiVideo className="h-8 w-8 text-destructive mb-2" />
                  <h3 className="font-medium mb-2">Managing Tools</h3>
                  <p className="text-sm text-gray-600">How to add and manage tools</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Get help from our support team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FiMessageSquare className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium">Email Support</h3>
                </div>
                <p className="text-sm text-gray-600">support@atreo.com</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FiHelpCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium">Documentation</h3>
                </div>
                <p className="text-sm text-gray-600">Visit our documentation portal for detailed guides</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
