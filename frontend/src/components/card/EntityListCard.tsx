import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EntityListCardProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export function EntityListCard({
  title,
  description,
  actions,
  children,
  contentClassName,
}: EntityListCardProps) {
  return (
    <Card className="p-0 gap-0">
      <CardHeader className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between p-4 sm:p-6 pb-3 sm:pb-4">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </CardHeader>
      <CardContent className={`p-4 pt-0 sm:p-6 sm:pt-0 ${contentClassName ?? ""}`}>{children}</CardContent>
    </Card>
  );
}
