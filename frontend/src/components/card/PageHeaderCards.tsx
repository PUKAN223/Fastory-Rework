import { Layers2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

export function PageHeaderCards({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-0 gap-0 overflow-hidden border-border/60 shadow-none">
      <CardHeader className="flex flex-col gap-3 sm:gap-1 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5">
        <div className="space-y-0.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-start gap-3 sm:gap-2 items-start">
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-semibold">
              <Layers2 className="size-4.5 sm:size-5 shrink-0 text-primary" />
              <span className="leading-tight">{title}</span>
            </CardTitle>
            {children ? (
              <div className="flex sm:hidden items-center gap-2 flex-wrap">{children}</div>
            ) : null}
          </div>
          <CardDescription className="text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">
            {description}
          </CardDescription>
        </div>
        {children ? (
          <div className="hidden sm:flex flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </CardHeader>
    </Card>
  );
}
