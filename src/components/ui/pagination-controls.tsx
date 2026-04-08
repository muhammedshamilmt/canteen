'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Build page numbers to show: always first, last, current ±1, with ellipsis
  const pages: (number | '...')[] = [];
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    range.push(i);
  }
  pages.push(1);
  if (range[0] > 2) pages.push('...');
  pages.push(...range);
  if (range[range.length - 1] < totalPages - 1) pages.push('...');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t">
      <p className="text-sm text-gray-500">
        Showing {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(p as number)}
              className="h-8 w-8 p-0 text-sm"
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
