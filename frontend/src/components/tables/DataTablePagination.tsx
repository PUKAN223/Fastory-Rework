import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: number) => void;
  /** Available page size options (defaults to 10, 25, 50, 100) */
  pageSizeOptions?: number[];
  /** Show only when data exists; caller can conditionally render */
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: DataTablePaginationProps) {
  const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col items-center justify-between gap-4 border-t border-border/40 px-4 py-3 sm:flex-row mt-3 ${className ?? ""}`}
    >
      {/* "Showing X to Y of Z items" */}
      <div className="text-xs text-muted-foreground">
        แสดง <span className="font-medium text-foreground">{startItem}</span> ถึง{" "}
        <span className="font-medium text-foreground">{endItem}</span> จากทั้งหมด{" "}
        <span className="font-medium text-foreground">
          {totalItems.toLocaleString()}
        </span>{" "}
        รายการ
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            แสดงต่อหน้า:
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
            title="หน้าแรก"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="px-2 text-xs font-medium">
            {safePage} / {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={safePage >= (totalPages || 1)}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            title="หน้าถัดไป"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={safePage >= (totalPages || 1)}
            onClick={() => onPageChange(totalPages)}
            title="หน้าสุดท้าย"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
