import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const PageTabs = Tabs
const PageTabsContent = TabsContent

const PageTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn("mb-4 flex w-full h-11", className)}
    {...props}
  />
))
PageTabsList.displayName = "PageTabsList"

const PageTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger> & {
    icon?: React.ElementType
  }
>(({ className, children, icon: Icon, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn("flex-1 text-sm sm:text-base", className)}
    {...props}
  >
    {Icon && <Icon className="size-4 shrink-0" />}
    <span className="truncate">{children}</span>
  </TabsTrigger>
))
PageTabsTrigger.displayName = "PageTabsTrigger"

export { PageTabs, PageTabsList, PageTabsTrigger, PageTabsContent }
