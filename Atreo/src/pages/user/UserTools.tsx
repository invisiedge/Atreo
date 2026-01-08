import { useState, useEffect } from 'react';
import { FiTool, FiEye, FiEyeOff, FiSearch, FiRefreshCw, FiShare2, FiChevronDown } from 'react-icons/fi';
import { apiClient } from '../../services/api';

// Service Type Categories
const SERVICE_CATEGORIES = [
  { id: 'all', name: 'All Tools' },
  { id: 'social-media', name: 'Social Media' },
  { id: 'communication', name: 'Communication' },
  { id: 'development', name: 'Development' },
  { id: 'design', name: 'Design' },
  { id: 'ai-tools', name: 'AI Tools' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'property-management', name: 'Property Management' },
  { id: 'other', name: 'Other' }
];

export default function UserTools() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTools();
      // Filter to show only active tools for users
      setTools(data.filter((tool: any) => tool.status === 'active'));
    } catch (err: any) {
      console.error('Error loading tools:', err);
      setError(err.message || 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCategoryDropdown && !target.closest('.relative')) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown]);

  const handleView = (tool: any) => {
    setSelectedTool(tool);
    setShowPassword(false); // Reset password visibility when opening view modal
    setShowViewModal(true);
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tool.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tool.category?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory = filterCategory === 'all' ||
                           tool.tags?.some((tag: string) =>
                             tag.toLowerCase().replace(/\s+/g, '-') === filterCategory
                           );

    return matchesSearch && matchesCategory;
  });

  // Separate shared and owned tools
  const sharedTools = filteredTools.filter(tool => tool.isShared);
  const ownedTools = filteredTools.filter(tool => !tool.isShared);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiTool className="h-8 w-8 text-foreground" />
          <h2 className="text-3xl font-bold text-foreground">Tools</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTools}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-100">{error}</p>
        </div>
      )}

      {/* Shared Credentials Section - Show prominently */}
      {sharedTools.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 dark:from-green-950 to-emerald-50 dark:to-emerald-950 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <FiShare2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Shared with Me</h3>
              <p className="text-sm text-muted-foreground">{sharedTools.length} credential{sharedTools.length !== 1 ? 's' : ''} shared with you</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedTools.map((tool) => (
              <div
                key={tool.id}
                className="bg-card rounded-lg border-2 border-green-300 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
                onClick={() => handleView(tool)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
                    <FiTool className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-semibold text-foreground truncate">{tool.name}</h4>
                    </div>
                    {tool.sharedBy && typeof tool.sharedBy === 'object' && (
                      <p className="text-xs text-muted-foreground mb-1">
                        By: {tool.sharedBy.name || tool.sharedBy.email || 'Unknown'}
                      </p>
                    )}
                    {tool.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{tool.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {tool.category && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-muted text-foreground">
                          {tool.category}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        <FiShare2 className="h-3 w-3" />
                        Shared
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <span>{SERVICE_CATEGORIES.find(cat => cat.id === filterCategory)?.name}</span>
              <FiChevronDown className={`h-4 w-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCategoryDropdown && (
              <div className="absolute left-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {SERVICE_CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setFilterCategory(category.id);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${
                        filterCategory === category.id ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold' : 'text-foreground'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {ownedTools.length > 0 && (
          <h3 className="text-lg font-semibold text-foreground mb-3">My Credentials ({ownedTools.length})</h3>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ownedTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(tool)}
            >
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <FiTool className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {tool.name}
                  </h3>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {tool.description.substring(0, 80)}...
                    </p>
                  )}
                  {tool.category && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-muted text-foreground">
                      {tool.category}
                    </span>
                  )}
                  {tool.isShared && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                      <FiShare2 className="h-3 w-3" />
                      Shared
                    </span>
                  )}
                  {tool.isPaid && (
                    <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300">
                      Paid
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <FiTool className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No tools found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm || filterCategory ? 'Try adjusting your search or filters.' : 'No tools available at the moment.'}
            </p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Tool Details</h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedTool(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                  <p className="text-sm text-foreground">{selectedTool.name}</p>
                </div>
                {selectedTool.description && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <p className="text-sm text-foreground">{selectedTool.description}</p>
                  </div>
                )}
                {selectedTool.category && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                    <p className="text-sm text-foreground">{selectedTool.category}</p>
                  </div>
                )}
                {selectedTool.username && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                    <p className="text-sm text-foreground font-mono">{selectedTool.username}</p>
                  </div>
                )}
                {selectedTool.password && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                    <div className="relative">
                      <p className="text-sm text-foreground font-mono bg-background px-3 py-2 pr-10 rounded-md border border-border">
                        {showPassword ? selectedTool.password : '••••••••'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-4 w-4" />
                        ) : (
                          <FiEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {selectedTool.apiKey && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
                    <p className="text-sm text-foreground font-mono">{selectedTool.apiKey.substring(0, 20)}...</p>
                  </div>
                )}
                {Array.isArray(selectedTool.tags) && selectedTool.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTool.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="inline-flex px-2 py-1 text-xs font-medium rounded bg-primary/20 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTool.notes && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTool.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedTool.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-foreground'
                  }`}>
                    {selectedTool.status}
                  </span>
                  {selectedTool.isPaid && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Paid
                    </span>
                  )}
                  {selectedTool.hasAutopay && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      Autopay
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedTool(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
