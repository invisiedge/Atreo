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
    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden group hover:-translate-y-2 transition-all duration-500 h-full">
      <CardContent className="p-0 h-full">
        <div className={`p-8 bg-gradient-to-br ${color} h-full text-white relative flex flex-col justify-between`}>
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-700">
             <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl">
               {icon}
             </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-bold tracking-widest uppercase opacity-80">{title}</p>
            <h3 className="text-4xl font-extrabold tracking-tight">{value}</h3>
          </div>
          
          <div className="mt-8 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold opacity-70">{subtitle}</p>
              {growth && (
                <div className="flex items-center gap-1.5">
                   <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-white/20 backdrop-blur-md`}>
                     {isPositive ? <FiTrendingUp className="w-2.5 h-2.5" /> : <FiTrendingDown className="w-2.5 h-2.5" />}
                     {growth}
                   </div>
                   <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Growth</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
