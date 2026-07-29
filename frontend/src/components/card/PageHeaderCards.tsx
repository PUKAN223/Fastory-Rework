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
    <Card className="overflow-hidden from-primary/10 via-primary/5">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Layers2 className="size-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </CardHeader>
    </Card>
  );
}
