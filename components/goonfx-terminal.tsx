'use client';

import { useMemo, useState } from 'react';
import { useBaseTrading } from '@/hooks/use-base-trading';
import { useGenericContractTrading, type GenericContractKind } from '@/hooks/use-generic-contract-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { LiveAccumulator } from './live-accumulator';
import { BarChart3, Bot, HelpCircle, FileText, History, LayoutDashboard, LineChart, LogIn, Menu, Settings, ShieldCheck, Wallet, X, Zap } from 'lucide-react';

const nav = [
  ['Dashboard', 'dashboard', LayoutDashboard], ['Manual Trader', 'manual', Zap], ['Over / Under', 'overunder', LineChart],
  ['Even / Odd', 'evenodd', BarChart3], ['Rise / Fall', 'risefall', LineChart], ['Digits 0–9', 'digits', BarChart3],
  ['Accumulator', 'accumulator', Zap], ['Bulk Trader', 'bulk', Zap], ['Portfolio', 'portfolio', Wallet],
  ['Transactions', 'transactions', History], ['Reports', 'reports', FileText], ['Bots', 'bots', Bot],
  ['Analysis', 'analysis', LineChart], ['Settings', 'settings', Settings], ['Support', 'support', HelpCircle],
] as const;
type Page = typeof nav[number][1];

function MiniChart({ prices }: { prices: number[] }) {
  const points = useMemo(() => {
    const p = prices.slice(-80);
    if (p.length < 2) return '';
    const min = Math.min(...p), max = Math.max(...p), range = max - min || 1;
    return p.map((v, i) => `${(i / (p.length - 1)) * 100},${94 - ((v - min) / range) * 82}`).join(' ');
  }, [prices]);
  return <div className="h-[340px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b1018]">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      {[20, 40, 60, 80].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="white" strokeOpacity=".06" strokeWidth=".25" />)}
      {points && <polyline points={points} fill="none" stroke="#00d395" strokeWidth=".8" vectorEffect="non-scaling-stroke" />}
    </svg>
  </div>;
}

function DigitAnalysis({ prices }: { prices: number[] }) {
  const counts = Array(10).fill(0) as number[];
  prices.slice(-100).forEach(p => counts[Math.abs(Math.floor(p * 10)) % 10]++);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const latest = prices.length ? Math.abs(Math.floor(prices[prices.length - 1] * 10)) % 10 : null;
  return <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">