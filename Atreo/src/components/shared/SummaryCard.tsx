import React from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  growth?: string;
}

export default function SummaryCard({ title, value, subtitle, icon, color, growth }: SummaryCardProps) {
  const isPositive = growth?.startsWith('+');
  return (
    <Card className="rounded-2xl border-none shadow-lg overflow-hidden group hover:-translate-y-1 transition-all duration-300 h-full">
      <CardContent className="p-0 h-full">
        <div className={`p-4 bg-gradient-to-br ${color} h-full text-white relative flex flex-col justify-between`}>
          <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform duration-300">
             <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xl">
               {icon}
             </div>
          </div>
          
          <div className="space-y-0.5">
            <p className="text-xs font-bold tracking-wide uppercase opacity-80">{title}</p>
            <h3 className="text-2xl font-extrabold tracking-tight">{value}</h3>
          </div>
          
          <div className="mt-4 flex items-end justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold opacity-70">{subtitle}</p>
              {growth && (
                <div className="flex items-center gap-1">
                   <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-white/20 backdrop-blur-md`}>
                     {isPositive ? <FiTrendingUp className="w-2 h-2" /> : <FiTrendingDown className="w-2 h-2" />}
                     {growth}
                   </div>
                   <span className="text-[9px] font-bold opacity-50 uppercase tracking-wide">Growth</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
