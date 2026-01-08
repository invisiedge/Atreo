import { useState, useEffect } from 'react';
import { FiActivity, FiDownload, FiSearch, FiAlertCircle, FiInfo, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '../../lib/logger';
import { apiClient } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import type { AuditLog } from '../../services/api/logs.api';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  user?: string;
  ipAddress?: string;
  action: string;
  status?: 'success' | 'failure' | 'error';
  errorMessage?: string;
}

export default function AdminLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadLogs();
    }, searchQuery ? 500 : 0); // Debounce search
    
    return () => clearTimeout(timeoutId);
  }, [filterLevel, filterCategory, page, searchQuery]);

  const loadStats = async () => {
    try {
      const statsData = await apiClient.getLogStats();
      setStats(statsData);
    } catch (error: any) {
      logger.error('Error loading log stats:', error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters: any = { 
        page, 
        limit: 50,
        resourceType: filterCategory !== 'all' ? filterCategory : undefined,
        status: filterLevel !== 'all' ? filterLevel : undefined,
        search: searchQuery || undefined
      };
      
      const response = await apiClient.getLogs(filters);
      
      // Map status to level
      const mapStatusToLevel = (status?: string): 'info' | 'warning' | 'error' | 'success' => {
        switch (status) {
          case 'error':
          case 'failure':
            return 'error';
          case 'success':
            return 'success';
          default:
            return 'info';
        }
      };
      
      const normalizedLogs: LogEntry[] = response.logs.map((log: AuditLog) => ({
        id: log.id,
        timestamp: log.timestamp,
        level: mapStatusToLevel(log.status || 'success'),
        category: log.resource || log.resourceType || 'general',
        message: log.details?.message || log.action || '',
        user: log.user?.name || log.user?.email || 'System',
        ipAddress: log.ipAddress || '',
        action: log.action,
        status: log.status,
        errorMessage: log.errorMessage,
      }));
      
      setLogs(normalizedLogs);
      setTotalPages(response.pagination.pages);
      setTotalLogs(response.pagination.total);
      setLoading(false);
    } catch (error: any) {
      logger.error('Error loading logs:', error);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Export all logs (with current filters)
      const filters: any = { 
        limit: 10000, // Large limit for export
        resource: filterCategory !== 'all' ? filterCategory : undefined,
        status: filterLevel !== 'all' ? filterLevel : undefined,
        search: searchQuery || undefined
      };
      
      const response = await apiClient.getLogs(filters);
      
      // Convert to CSV
      const headers = ['Timestamp', 'Level', 'Category', 'Action', 'User', 'IP Address', 'Message'];
      const rows = response.logs.map((log: AuditLog) => {
        const level = log.status === 'error' || log.status === 'failure' ? 'Error' : 
                     log.status === 'success' ? 'Success' : 'Info';
        return [
          new Date(log.timestamp).toISOString(),
          level,
          log.resource || log.resourceType || 'general',
          log.action,
          log.user?.name || log.user?.email || 'System',
          log.ipAddress || '',
          (log.details?.message || log.action || '').replace(/"/g, '""')
        ];
      });
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atreo-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Logs exported successfully', 'success');
    } catch (error: any) {
      logger.error('Error exporting logs:', error);
      showToast('Failed to export logs', 'error');
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <FiXCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <FiAlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <FiCheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <FiInfo className="h-4 w-4 text-blue-600" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400">Warning</Badge>;
      case 'success':
        return <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400">Success</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
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
          <FiActivity className="h-8 w-8 text-gray-700" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">System Logs</h2>
            <p className="text-sm text-gray-500">Audit logs and system events</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FiDownload className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Logs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadLogs();
                    }
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterLevel} onValueChange={(value) => { setFilterLevel(value); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={(value) => { setFilterCategory(value); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Tool">Tool</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Organization">Organization</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Submission">Submission</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FiActivity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No logs found</h3>
                    <p className="mt-1 text-sm text-gray-500">System logs will appear here.</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        {getLevelBadge(log.level)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.user || '-'}</TableCell>
                    <TableCell className="max-w-md truncate">{log.message}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, totalLogs)} of {totalLogs} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Statistics Card */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.summary.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.summary.logsLast24Hours.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 24 Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.summary.logsLast7Days.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.summary.logsLast30Days.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 Days</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
