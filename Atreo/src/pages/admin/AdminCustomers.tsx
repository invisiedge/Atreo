import { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '../../services/api';
import type { Customer as ApiCustomer } from '../../services/api/customers.api';
import { logger } from '../../lib/logger';

interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: 'active' | 'inactive';
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await apiClient.getCustomers({ page: 1, limit: 20 });
      const mappedCustomers: Customer[] = response.customers.map((customer: ApiCustomer) => ({
        id: customer._id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        status: customer.status === 'active' ? 'active' : 'inactive',
        totalOrders: 0,
        totalSpent: customer.totalRevenue ?? 0,
        createdAt: customer.createdAt,
      }));
      setCustomers(mappedCustomers);
      setLoading(false);
    } catch (error: any) {
      logger.error('Error loading customers:', error);
      setLoading(false);
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
          <FiUsers className="h-8 w-8 text-gray-700" />
          <h2 className="text-2xl font-bold text-foreground">Customers</h2>
        </div>
        <Button>
          <FiPlus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Customers</CardTitle>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No customers found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding a customer.</p>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.company || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.totalOrders}</TableCell>
                    <TableCell>${customer.totalSpent.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
    </div>
  );
}
