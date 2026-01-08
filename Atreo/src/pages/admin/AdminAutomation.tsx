import { useState } from 'react';
import { FiPlayCircle, FiPlus, FiEdit2, FiTrash2, FiPower, FiClock } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  status: 'active' | 'inactive';
  lastRun?: string;
  runCount: number;
}

export default function AdminAutomation() {
  const [automations] = useState<Automation[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FiPlayCircle className="h-8 w-8 text-gray-700" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">Automation</h2>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Beta
              </Badge>
            </div>
            <p className="text-sm text-gray-500">Automate workflows and tasks</p>
          </div>
        </div>
        <Button>
          <FiPlus className="h-4 w-4 mr-2" />
          Create Automation
        </Button>
      </div>

      <Alert>
        <FiPlayCircle className="h-4 w-4" />
        <AlertDescription>
          Automation is currently in beta. Some features may be limited or unstable.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {automations.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <FiPlayCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No automations</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first automation to get started.</p>
            </CardContent>
          </Card>
        ) : (
          automations.map((automation) => (
            <Card key={automation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{automation.name}</CardTitle>
                    <CardDescription className="mt-1">{automation.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Toggle automation status
                    }}
                  >
                    <FiPower className={`h-4 w-4 ${automation.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Trigger:</span>
                    <span className="font-medium">{automation.trigger}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Action:</span>
                    <span className="font-medium">{automation.action}</span>
                  </div>
                  {automation.lastRun && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <FiClock className="h-3 w-3" />
                      Last run: {new Date(automation.lastRun).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <Badge variant={automation.status === 'active' ? 'default' : 'secondary'}>
                      {automation.status}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <FiEdit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
