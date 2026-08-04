"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Filter,
  History,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserX,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Containers } from "@/components/Containers";
import { DataTablePagination } from "@/components/tables/DataTablePagination";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMembers } from "@/features/staffSlice";
import { requestWithRefresh } from "@/lib/request";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

export interface ActivityLog {
  id: string;
  type: "sale" | "void_sale" | "stock_adjustment" | "restock" | "other";
  actionTitle: string;
  details: string;
  amount?: number;
  orderNumber?: string;
  user: {
    id: number;
    username: string;
    email: string;
    jobTitle: string;
  };
  createdAt: string;
}

function getTypeBadge(type: ActivityLog["type"]) {
  switch (type) {
    case "sale":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-normal gap-1 text-[11px]"
        >
          <ShoppingBag className="w-3 h-3" /> ขายสินค้า
        </Badge>
      );
    case "void_sale":
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive font-normal gap-1 text-[11px]"
        >
          <UserX className="w-3 h-3" /> ยกเลิกคำสั่งซื้อ
        </Badge>
      );
    case "restock":
      return (
        <Badge
          variant="outline"
          className="border-blue-500/30 bg-blue-500/10 text-blue-600 font-normal gap-1 text-[11px]"
        >
          <ArrowDownRight className="w-3 h-3" /> เติมสต็อก
        </Badge>
      );
    case "stock_adjustment":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-600 font-normal gap-1 text-[11px]"
        >
          <SlidersHorizontal className="w-3 h-3" /> ปรับปรุงสต็อก
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-normal text-[11px]">
          กิจกรรม
        </Badge>
      );
  }
}

export default function EmployeeLogsPage() {
  const dispatch = useAppDispatch();
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const members = useAppSelector((state) => state.staff.items);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDays, setSelectedDays] = useState<string>("7");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      if (members.length === 0) {
        dispatch(fetchMembers(activeStoreId));
      }
      const params = new URLSearchParams();
      if (selectedUser !== "all") params.append("userId", selectedUser);
      if (selectedType !== "all") params.append("type", selectedType);
      if (selectedDays !== "all") params.append("days", selectedDays);

      const queryStr = params.toString();
      const res = await requestWithRefresh(
        `/api/stores/${activeStoreId}/members/logs${queryStr ? `?${queryStr}` : ""}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load employee logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId, selectedUser, selectedType, selectedDays]);

  // Client-side text search
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(
      (log) =>
        log.actionTitle.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.user.username.toLowerCase().includes(q) ||
        (log.orderNumber && log.orderNumber.toLowerCase().includes(q)),
    );
  }, [logs, searchQuery]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUser, selectedType, selectedDays, pageSize]);

  const totalPages = useMemo(
    () => Math.ceil(filteredLogs.length / pageSize) || 1,
    [filteredLogs.length, pageSize],
  );

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const startIndex =
    filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredLogs.length);

  // Summary stats (from raw logs, not filtered)
  const stats = useMemo(() => {
    const totalCount = logs.length;
    const salesCount = logs.filter((l) => l.type === "sale").length;
    const voidCount = logs.filter((l) => l.type === "void_sale").length;
    const stockCount = logs.filter(
      (l) => l.type === "stock_adjustment" || l.type === "restock",
    ).length;
    return { totalCount, salesCount, voidCount, stockCount };
  }, [logs]);

  return (
    <Containers>
      {/* Page Header */}
      <PageHeaderCards
        title="ประวัติกิจกรรมพนักงาน"
        description="ตรวจสอบบันทึกย้อนหลังการปฏิบัติงาน การขายสินค้า การยกเลิก และการปรับสต็อกของพนักงาน"
      />

      {/* Summary Stats — ProductStatsCards compact pattern */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x snap-mandatory sm:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Card className="border-border/60 py-3 shadow-none min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start sm:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">กิจกรรมทั้งหมด</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold tracking-tight">{stats.totalCount}</p>
            )}
            <p className="text-xs text-muted-foreground">รายการในช่วงที่เลือก</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 py-3 shadow-none min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start sm:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">การขาย (POS)</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold tracking-tight text-emerald-600">{stats.salesCount}</p>
            )}
            <p className="text-xs text-muted-foreground">รายการขายสินค้า</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 py-3 shadow-none min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start sm:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">ปรับปรุงสต็อก</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold tracking-tight">{stats.stockCount}</p>
            )}
            <p className="text-xs text-muted-foreground">รับสินค้า / ปรับสต็อก</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 py-3 shadow-none min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start sm:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">รายการยกเลิก</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className={`text-3xl font-semibold tracking-tight ${stats.voidCount > 0 ? "text-destructive" : ""}`}>
                {stats.voidCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {stats.voidCount > 0 ? "มีรายการที่ถูกยกเลิก" : "ไม่มีรายการยกเลิก"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar — same pattern as Reports page filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card shadow-none">
        <div className="relative w-full sm:max-w-sm shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาเลขคำสั่งซื้อ, สินค้า, ชื่อพนักงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 gap-2 items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[150px]">
                <SelectValue placeholder="พนักงานทุกคน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">พนักงานทุกคน</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={String(m.userId)} className="text-xs">
                    {m.user.username} ({m.jobTitle || "พนักงาน"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-xs w-[130px] sm:w-[140px]">
                <SelectValue placeholder="ทุกกิจกรรม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">ทุกกิจกรรม</SelectItem>
                <SelectItem value="sale" className="text-xs">การขายสินค้า</SelectItem>
                <SelectItem value="void_sale" className="text-xs">ยกเลิกคำสั่งซื้อ</SelectItem>
                <SelectItem value="stock_adjustment" className="text-xs">ปรับสต็อก</SelectItem>
                <SelectItem value="restock" className="text-xs">เติมสต็อก</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={selectedDays} onValueChange={setSelectedDays}>
              <SelectTrigger className="h-8 text-xs w-[110px] sm:w-[120px]">
                <SelectValue placeholder="7 วันล่าสุด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">วันนี้</SelectItem>
                <SelectItem value="7" className="text-xs">7 วันล่าสุด</SelectItem>
                <SelectItem value="30" className="text-xs">30 วันล่าสุด</SelectItem>
                <SelectItem value="all" className="text-xs">ทั้งหมด</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Logs Table Card — EntityListCard pattern */}
      <Card className="border-border/60 shadow-none overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>รายการบันทึกกิจกรรม</CardTitle>
            <CardDescription>
              {loading
                ? "กำลังโหลดข้อมูล..."
                : `พบ ${filteredLogs.length} รายการ (แสดงหน้าละ ${pageSize} รายการ)`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5 text-xs h-8 shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            รีเฟรช
          </Button>
        </CardHeader>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Empty className="py-16">
            <EmptyMedia>
              <History className="w-10 h-10 text-muted-foreground/50" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>ไม่พบประวัติกิจกรรมพนักงาน</EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
                  : "ยังไม่มีบันทึกการปฏิบัติงานในช่วงเวลาที่เลือก"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs w-[150px] pl-4">เวลา</TableHead>
                  <TableHead className="text-xs w-[180px]">พนักงาน</TableHead>
                  <TableHead className="text-xs w-[150px]">ประเภทกิจกรรม</TableHead>
                  <TableHead className="text-xs">รายละเอียด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const logDate = new Date(log.createdAt);
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      {/* Time */}
                      <TableCell className="pl-4 py-3 align-top text-xs">
                        <div className="font-medium text-foreground">
                          {format(logDate, "HH:mm 'น.'")}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {format(logDate, "d MMM yyyy", { locale: th })}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border">
                            <AvatarFallback className="text-[10px] font-bold">{log.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{log.user.username}</div>
                            <div className="text-[11px] text-muted-foreground">{log.user.jobTitle}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top text-xs">{getTypeBadge(log.type)}</TableCell>
                      <TableCell className="py-3 align-top text-xs">
                        <div className="font-medium text-foreground">{log.actionTitle}</div>
                        <p className="text-muted-foreground mt-0.5">{log.details}</p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && filteredLogs.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredLogs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            className="border-none bg-muted/10 rounded-b-xl"
          />
        )}
      </Card>
    </Containers>
  );
}
