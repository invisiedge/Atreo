import React, { useState, useEffect } from 'react';
import {
  FiKey,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiFilter,
  FiUsers,
  FiLock,
  FiShield,
  FiCopy,
  FiExternalLink,
  FiInfo,
  FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { apiClient } from '../../services/api';
import { logger } from '../../lib/logger';

interface Credential {
  id: string;
  name: string;
  username: string;
  password: string;
  url?: string;
  category: string;
  department: string;
  project: string;
  owner: string;
  sharedWith: string[];
  tags: string[];
  lastModified: string;
  status: 'active' | 'inactive' | 'expired';
  notes?: string;
}

const SERVICE_CATEGORIES = [
  'All Categories',
  'Cloud Services',
  'Development',
  'Marketing',
  'Communication',
  'Design',
  'Analytics',
  'Security',
  'Finance',
  'Other'
];

const DEPARTMENTS = [
  'All Departments',
  'IT',
  'Marketing',
  'Finance',
  'HR',
  'Sales',
  'Operations',
  'Design'
];

export default function AccountantCredentials() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load credentials from API - accountants can see all credentials like admins
  useEffect(() => {
    const loadCredentials = async () => {
      setLoading(true);
      try {
        // Fetch all tools/credentials - accountants have access to all credentials
        const tools = await apiClient.getTools();
        
        // Transform tools to credentials format
        const credentialsData: Credential[] = tools.map((tool: any) => ({
          id: tool.id || tool._id,
          name: tool.name || '',
          username: tool.username || '',
          password: tool.password ? '••••••••••••' : '', // Masked by default
          url: tool.url || '',
          category: tool.category || 'Other',
          department: tool.department || 'General',
          project: tool.project || '',
          owner: tool.createdBy && typeof tool.createdBy === 'object' 
            ? (tool.createdBy.name || tool.createdBy.email || 'Unknown')
            : 'Unknown',
          sharedWith: tool.isShared ? ['Shared'] : [],
          tags: Array.isArray(tool.tags) ? tool.tags : [],
          lastModified: tool.updatedAt || tool.createdAt || new Date().toISOString(),
          status: tool.status === 'active' ? 'active' : 'inactive',
          notes: tool.notes || ''
        }));

        setCredentials(credentialsData);
      } catch (error: any) {
        logger.error('Error loading credentials:', error);
        showToast('Failed to load credentials', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCredentials();
  }, [showToast]);

  // Filter credentials based on search and filters
  const filteredCredentials = credentials.filter(credential => {
    const matchesSearch = credential.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credential.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credential.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credential.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All Categories' || credential.category === selectedCategory;
    const matchesDepartment = selectedDepartment === 'All Departments' || credential.department === selectedDepartment;

    return matchesSearch && matchesCategory && matchesDepartment;
  });

  const togglePasswordVisibility = async (credentialId: string) => {
    // If password is masked, fetch the real password
    const credential = credentials.find(c => c.id === credentialId);
    if (credential && credential.password === '••••••••••••') {
      try {
        // Fetch the actual credential details
        const tool = await apiClient.getTool(credentialId);
        const updatedCredentials = credentials.map(cred => 
          cred.id === credentialId 
            ? { ...cred, password: tool.password || '' }
            : cred
        );
        setCredentials(updatedCredentials);
      } catch (error: any) {
        logger.error('Error fetching credential details:', error);
        showToast('Failed to load credential details', 'error');
        return;
      }
    }
    
    setShowPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${field} copied to clipboard`, 'success');
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const openCredentialDetail = (credential: Credential) => {
    setSelectedCredential(credential);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <FiRefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization Credentials</h1>
          <p className="mt-1 text-muted-foreground">
            View organization credentials (Read-only access)
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg">
          <FiShield className="h-4 w-4" />
          Accountant - View Only
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SERVICE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Credentials Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCredentials.map((credential) => (
          <div key={credential.id} className="bg-card rounded-lg border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <FiKey className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{credential.name}</h3>
                  <p className="text-sm text-muted-foreground">{credential.category}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(credential.status)}`}>
                {credential.status}
              </span>
            </div>

            <div className="space-y-3">
              {/* Username */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Username:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{credential.username}</span>
                  <button
                    onClick={() => copyToClipboard(credential.username, 'Username')}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy username"
                  >
                    <FiCopy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {showPasswords[credential.id] ? credential.password : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(credential.id)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title={showPasswords[credential.id] ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords[credential.id] ? (
                      <FiEyeOff className="h-3 w-3" />
                    ) : (
                      <FiEye className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(credential.password, 'Password')}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy password"
                  >
                    <FiCopy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* URL */}
              {credential.url && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">URL:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={credential.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline max-w-48 truncate"
                    >
                      {credential.url}
                    </a>
                    <FiExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Department & Project */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Department:</span>
                <span className="text-sm">{credential.department}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Project:</span>
                <span className="text-sm">{credential.project}</span>
              </div>

              {/* Owner */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Owner:</span>
                <span className="text-sm">{credential.owner}</span>
              </div>

              {/* Shared With */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Shared with:</span>
                <div className="flex items-center gap-1">
                  <FiUsers className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{credential.sharedWith.length} teams</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {credential.tags.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-1">
                  {credential.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => openCredentialDetail(credential)}
                className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <FiInfo className="h-4 w-4 mr-1" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCredentials.length === 0 && (
        <div className="text-center py-12">
          <FiKey className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No credentials found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== 'All Categories' || selectedDepartment !== 'All Departments'
              ? 'Try adjusting your filters or search terms.'
              : 'No credentials have been shared with your role yet.'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Credential Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedCredential.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCredential.status)}`}>
                    {selectedCredential.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Username
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                        {selectedCredential.username}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedCredential.username, 'Username')}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FiCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Password
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                        {showPasswords[selectedCredential.id] ? selectedCredential.password : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => togglePasswordVisibility(selectedCredential.id)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords[selectedCredential.id] ? (
                          <FiEyeOff className="h-4 w-4" />
                        ) : (
                          <FiEye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedCredential.password, 'Password')}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FiCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {selectedCredential.url && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      URL
                    </label>
                    <a
                      href={selectedCredential.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      {selectedCredential.url}
                      <FiExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </label>
                    <p>{selectedCredential.category}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Department
                    </label>
                    <p>{selectedCredential.department}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Project
                    </label>
                    <p>{selectedCredential.project}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Owner
                    </label>
                    <p>{selectedCredential.owner}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Shared With
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCredential.sharedWith.map((team, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCredential.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedCredential.notes && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Notes
                    </label>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {selectedCredential.notes}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Last Modified
                  </label>
                  <p className="text-sm">{new Date(selectedCredential.lastModified).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
