import { useState, useEffect } from 'react';
import { FiLock, FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';

interface Credential {
  id: string;
  name: string;
  type?: 'password' | 'api-key' | 'token' | 'certificate';
  username?: string;
  password?: string;
  encryptedPassword?: string;
  encryptedApiKey?: string;
  apiKey?: string;
  service: string;
  lastAccessed?: string;
  accessedBy?: string;
  accessCount?: number;
  status?: 'active' | 'revoked';
  createdAt?: string;
  notes?: string;
  tags?: string[];
}

export default function AdminCredentials() {
  const { showToast, ToastContainer } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState({
    name: '',
    type: 'password' as 'password' | 'api-key' | 'token' | 'certificate',
    username: '',
    password: '',
    apiKey: '',
    service: ''
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await apiClient.getCredentials(1, 20);
      setCredentials(response.credentials.map(cred => ({
        id: cred.id,
        name: cred.name,
        service: cred.service,
        username: cred.username,
        password: '••••••••••••', // Masked by default
        apiKey: cred.apiKey,
        notes: cred.notes,
        tags: cred.tags
      })));
      setLoading(false);
    } catch (error: any) {
      logger.error('Error loading credentials:', error);
      showToast('Failed to load credentials', 'error');
      setLoading(false);
    }
  };

  const handleViewCredential = async (credential: Credential) => {
    // Log access
    logger.debug(`Accessing credential: ${credential.id} by user`);
    
    try {
      // If password is masked, fetch the real password
      if (credential.password === '••••••••••••') {
        const response = await apiClient.getCredential(credential.id);
        const updatedCredentials = credentials.map(cred => 
          cred.id === credential.id 
            ? { ...cred, password: response.credential.password || '' }
            : cred
        );
        setCredentials(updatedCredentials);
      }
      
      setShowPassword(prev => ({ ...prev, [credential.id]: !prev[credential.id] }));
    } catch (error: any) {
      logger.error('Error fetching credential details:', error);
      showToast('Failed to access credential', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FiLock className="h-8 w-8 text-gray-700" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Credentials</h2>
            <p className="text-sm text-gray-500">Encrypted credentials with access logging</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <FiPlus className="h-4 w-4 mr-2" />
          Add Credential
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Credentials</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <FiShield className="h-4 w-4 text-green-600" />
              <span className="text-xs">All credentials are encrypted and access is logged</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <FiLock className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-foreground">No credentials found</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by adding a credential.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  credentials.map((credential) => (
                    <TableRow key={credential.id}>
                      <TableCell className="font-medium">{credential.name}</TableCell>
                      <TableCell>{credential.username || '-'}</TableCell>
                      <TableCell>{credential.service}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewCredential(credential)}
                            title="View Credential"
                          >
                            {showPassword[credential.id] ? (
                              <FiEyeOff className="h-4 w-4" />
                            ) : (
                              <FiEye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon">
                            <FiEdit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AWS Root Account"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="password">Password</option>
                <option value="api-key">API Key</option>
                <option value="token">Token</option>
                <option value="certificate">Certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <Input
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="e.g., Cloud, DevTools, Auth, etc."
              />
            </div>
            {formData.type === 'password' && (
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">
                {formData.type === 'password' ? 'Password' : formData.type === 'api-key' ? 'API Key' : 'Value'} *
              </label>
              <Input
                type="password"
                value={formData.type === 'password' ? formData.password : formData.apiKey}
                onChange={(e) => {
                  if (formData.type === 'password') {
                    setFormData({ ...formData, password: e.target.value });
                  } else {
                    setFormData({ ...formData, apiKey: e.target.value });
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                if (!formData.name || !formData.service) {
                  showToast('Name and service are required', 'error');
                  return;
                }
                
                await apiClient.createCredential({
                  name: formData.name,
                  service: formData.service,
                  username: formData.username,
                  password: formData.type === 'password' ? formData.password : undefined,
                  apiKey: formData.type !== 'password' ? formData.apiKey : undefined,
                  notes: '',
                  tags: []
                });
                
                showToast('Credential created and encrypted successfully', 'success');
                setShowCreateModal(false);
                setFormData({
                  name: '',
                  type: 'password',
                  username: '',
                  password: '',
                  apiKey: '',
                  service: ''
                });
                loadCredentials(); // Refresh the list
              } catch (error: any) {
                logger.error('Error creating credential:', error);
                showToast('Failed to create credential', 'error');
              }
            }}>Add Credential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
}
