"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AiTableCardProps {
  title?: string;
  headers?: string[];
  rows?: any[];
  defaultPageSize?: number;
}

export const AiTableCard: React.FC<AiTableCardProps> = ({
  title,
  headers = [],
  rows = [],
  defaultPageSize = 5,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColIndex, setSortColIndex] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Normalize headers and rows in case AI outputs array of objects or 1D array
  const safeHeaders = useMemo(() => {
    if (headers && headers.length > 0) return headers;
    if (
      rows &&
      rows.length > 0 &&
      typeof rows[0] === "object" &&
      !Array.isArray(rows[0])
    ) {
      return Object.keys(rows[0]);
    }
    return [];
  }, [headers, rows]);

  const safeRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => {
      if (Array.isArray(row)) return row;
      if (typeof row === "object" && row !== null) {
        return Object.values(row);
      }
      return [String(row)];
    });
  }, [rows]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return safeRows;
    const query = searchQuery.toLowerCase();
    return safeRows.filter((row) =>
      row.some((cell: any) =>
        String(cell ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [safeRows, searchQuery]);

  // Sort filtered rows if sort column is active
  const sortedRows = useMemo(() => {
    if (sortColIndex === null) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColIndex] ?? "";
      const valB = b[sortColIndex] ?? "";

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc
        ? String(valA).localeCompare(String(valB), "th")
        : String(valB).localeCompare(String(valA), "th");
    });
  }, [filteredRows, sortColIndex, sortAsc]);

  // Pagination bounds
  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRows = sortedRows.slice(startIndex, endIndex);

  const handleSort = (index: number) => {
    if (sortColIndex === index) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortColIndex(null);
        setSortAsc(true);
      }
    } else {
      setSortColIndex(index);
      setSortAsc(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="my-4 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col gap-0 border-border/80">
      {/* Header section */}
      <div className="p-3.5 bg-muted/30 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <TableIcon className="size-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">
              {title || "ตารางข้อมูล"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              ทั้งหมด {safeRows.length} รายการ
              {searchQuery && ` (กรองเหลือ ${totalItems} รายการ)`}
            </p>
          </div>
        </div>

        {/* Search bar & Page size toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ค้นหาในตาราง..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-8 text-xs pl-8 pr-2 w-36 sm:w-48 bg-background/80"
            />
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 text-xs px-2 py-1 rounded-md border border-input bg-background/80 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={5}>5 / หน้า</option>
            <option value={10}>10 / หน้า</option>
            <option value={20}>20 / หน้า</option>
            <option value={50}>50 / หน้า</option>
          </select>
        </div>
      </div>

      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b border-border/60">
              <th className="py-2.5 px-3 w-10 text-center font-medium">#</th>
              {safeHeaders.map((header, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(idx)}
                  className="py-2.5 px-3 font-semibold text-foreground cursor-pointer select-none hover:bg-muted/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header}</span>
                    {sortColIndex === idx ? (
                      sortAsc ? (
                        <ArrowUp className="size-3 text-primary" />
                      ) : (
                        <ArrowDown className="size-3 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row: any[], rIdx: number) => (
                <tr
                  key={rIdx}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="py-2 px-3 text-center text-muted-foreground text-[11px]">
                    {startIndex + rIdx + 1}
                  </td>
                  {row.map((cell: any, cIdx: number) => (
                    <td
                      key={cIdx}
                      className="py-2 px-3 whitespace-nowrap text-foreground font-medium"
                    >
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={safeHeaders.length + 1}
                  className="py-8 text-center text-muted-foreground text-xs"
                >
                  {searchQuery ? "ไม่พบข้อมูลที่ตรงกับการค้นหา" : "ไม่มีข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer & Pagination */}
      {totalItems > 0 && (
        <div className="p-2.5 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-muted-foreground">
            แสดง {startIndex + 1} - {endIndex} จาก {totalItems} รายการ
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                title="หน้าแรก"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              <span className="px-2 text-[11px] font-medium text-foreground">
                หน้า {validCurrentPage} / {totalPages}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={validCurrentPage === totalPages}
                title="หน้าถัดไป"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                title="หน้าสุดท้าย"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
