import { useMemo, useState } from "react";

interface UsePaginationOptions {
  /** Total number of items to paginate */
  totalItems: number;
  /** Default number of items per page (default: 10) */
  defaultPageSize?: number;
  /** Default starting page (default: 1) */
  defaultPage?: number;
}

interface UsePaginationReturn {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Current page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Safe current page (clamped to valid range) */
  safeCurrentPage: number;
  /** Index of the first item on the current page (0-indexed) */
  startIndex: number;
  /** Index after the last item on the current page (0-indexed) */
  endIndex: number;
  /** Set the current page */
  setCurrentPage: (page: number) => void;
  /** Set the page size and reset to page 1 */
  setPageSize: (size: number) => void;
  /**
   * Slice an array to only the items on the current page.
   * Use this with a memoized/filtered array.
   */
  paginate: <T>(items: T[]) => T[];
}

/**
 * Custom hook for managing pagination state.
 *
 * @example
 * ```tsx
 * const { currentPage, pageSize, totalPages, safeCurrentPage, setCurrentPage, setPageSize, paginate } = usePagination({
 *   totalItems: filteredItems.length,
 *   defaultPageSize: 10,
 * });
 *
 * const paginatedItems = useMemo(() => paginate(filteredItems), [filteredItems, currentPage, pageSize]);
 *
 * return (
 *   <>
 *     {paginatedItems.map(item => <Item key={item.id} {...item} />)}
 *     <DataTablePagination
 *       currentPage={safeCurrentPage}
 *       totalPages={totalPages}
 *       pageSize={pageSize}
 *       totalItems={filteredItems.length}
 *       onPageChange={setCurrentPage}
 *       onPageSizeChange={setPageSize}
 *     />
 *   </>
 * );
 * ```
 */
export function usePagination({
  totalItems,
  defaultPageSize = 10,
  defaultPage = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPageState] = useState(defaultPage);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  const safeCurrentPage = useMemo(
    () => Math.max(1, Math.min(currentPage, totalPages)),
    [currentPage, totalPages],
  );

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const setCurrentPage = (page: number) => {
    setCurrentPageState(Math.max(1, Math.min(page, totalPages)));
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPageState(1); // Reset to first page on page size change
  };

  const paginate = <T,>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setPageSize,
    paginate,
  };
}
