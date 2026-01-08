import { useMemo } from 'react';
import { FiFileText, FiClock, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';
import SummaryCard from '@/components/shared/SummaryCard';
import type { InvoiceSummary } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceSummaryCardsProps {
  summary: InvoiceSummary | null;
  loading?: boolean;
}

export default function InvoiceSummaryCards({ summary, loading }: InvoiceSummaryCardsProps) {
  // Memoize currency formatter for performance
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: summary?.currency || 'USD',
      maximumFractionDigits: 0
    });
    return (amount: number) => formatter.format(amount);
  }, [summary?.currency]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} className="h-48 w-full rounded-[2.5rem]" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const cards = [
    {
      title: 'Total Invoices',
      value: summary.totalInvoices.toLocaleString(),
      subtitle: `Total volume: ${formatCurrency(summary.totalAmount)}`,
      icon: <FiFileText className="w-6 h-6 text-white" />,
      color: 'from-purple-600 to-indigo-700',
      growth: '+12%' // Dummy growth as it's not in the summary object yet
    },
    {
      title: 'Pending',
      value: summary.pendingInvoices.toLocaleString(),
      subtitle: `Awaiting: ${formatCurrency(summary.pendingAmount)}`,
      icon: <FiClock className="w-6 h-6 text-white" />,
      color: 'from-blue-500 to-cyan-600',
      growth: '+5%'
    },
    {
      title: 'Approved',
      value: summary.approvedInvoices.toLocaleString(),
      subtitle: `Processed: ${formatCurrency(summary.approvedAmount)}`,
      icon: <FiCheckCircle className="w-6 h-6 text-white" />,
      color: 'from-emerald-500 to-green-600',
      growth: '+8%'
    },
    {
      title: 'Rejected',
      value: summary.rejectedInvoices.toLocaleString(),
      subtitle: `Flagged: ${formatCurrency(summary.rejectedAmount)}`,
      icon: <FiXCircle className="w-6 h-6 text-white" />,
      color: 'from-rose-500 to-red-600',
      growth: '-2%'
    },
    {
      title: 'Avg. Amount',
      value: formatCurrency(summary.averageInvoiceAmount),
      subtitle: 'Average per invoice',
      icon: <FiDollarSign className="w-6 h-6 text-white" />,
      color: 'from-orange-500 to-amber-600',
      growth: '+3%'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((card, index) => (
        <SummaryCard
          key={index}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          color={card.color}
          growth={card.growth}
        />
      ))}
    </div>
  );
}
