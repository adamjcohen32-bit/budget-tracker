import React from 'react';

function Block({ className }) {
  return <div className={`animate-pulse bg-gray-800/70 rounded-xl ${className}`} />;
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        <Block className="h-32" />
        <Block className="h-32" />
      </div>
      <Block className="h-11 w-40" />
      <div className="space-y-3">
        <Block className="h-5 w-32" />
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
      </div>
    </div>
  );
}
