// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiDollarSign,
  FiTrendingUp,
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiFileText
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { DashboardService, type UserDashboardStats } from '../../services/dashboardService';
import { SubmissionService } from '../../services/submissionService';
import { type Submission } from '../../services/api';
import { logger } from '../../lib/logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [dashboardStats, userSubmissions] = await Promise.all([
        DashboardService.getUserStats(),
        SubmissionService.getSubmissions()
      ]);
      setStats(dashboardStats);
      setSubmissions(userSubmissions);
      setError(null);
    } catch (error) {
      logger.error('Failed to fetch user dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': 
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5"><FiCheckCircle /> Approved</Badge>;
      case 'rejected': 
        return <Badge variant="destructive" className="px-3 py-1 rounded-full flex items-center gap-1.5"><FiXCircle /> Rejected</Badge>;
      case 'pending': 
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5"><FiClock /> Pending</Badge>;
      default: 
        return <Badge variant="secondary" className="px-3 py-1 rounded-full">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground flex items-center gap-2">
            <FiActivity className="text-primary animate-pulse" />
            Your personal financial command center
          </p>
        </div>
        <Button className="rounded-2xl px-8 py-6 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group">
          New Submission <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard 
          title="Total Earnings"
          value={`$${(stats?.totalEarnings || 0).toLocaleString()}`}
          icon={<FiDollarSign className="text-white" />}
          color="from-blue-600 to-indigo-600"
          subtitle="All-time approved payments"
        />
        <MetricCard 
          title="In Review"
          value={stats?.pendingRequests || 0}
          icon={<FiClock className="text-white" />}
          color="from-amber-500 to-orange-600"
          subtitle="Awaiting administrative approval"
        />
        <MetricCard 
          title="Approved"
          value={stats?.approvedRequests || 0}
          icon={<FiCheckCircle className="text-white" />}
          color="from-emerald-500 to-teal-600"
          subtitle="Requests successfully processed"
        />
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 gap-8">
        <Card className="rounded-[2.5rem] border-border shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
          <CardHeader className="p-8 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                   <FiFileText className="text-primary" /> Submission History
                </CardTitle>
                <CardDescription className="text-base">Real-time status of your payment requests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             {submissions.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                   <FiFileText className="w-10 h-10" />
                </div>
                <p className="text-muted-foreground font-medium">No activity found. Start by submitting your first request.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-accent/5 transition-colors group cursor-default">
                        <td className="px-8 py-6">
                          <span className="text-lg font-bold text-foreground tracking-tight">
                            ${sub.totalAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="max-w-md">
                             <p className="text-sm font-medium text-foreground line-clamp-1">{sub.description}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          {getStatusBadge(sub.status)}
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                             <FiCalendar className="text-primary/60" />
                             {formatDate(sub.submittedAt)}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, subtitle }) {
  return (
    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
      <CardContent className="p-0">
        <div className={`p-8 bg-gradient-to-br ${color} h-full text-white relative`}>
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-700">
             <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl">
               {icon}
             </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-black tracking-[0.2em] uppercase opacity-70">{title}</p>
            <h3 className="text-4xl font-black tracking-tight">{value}</h3>
          </div>
          
          <div className="mt-8">
            <p className="text-xs font-medium opacity-60 leading-relaxed">{subtitle}</p>
            <div className="mt-4 h-1 w-12 bg-white/30 rounded-full group-hover:w-24 transition-all duration-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
