"use client";

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import Fuse from "fuse.js";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  DynamicIcon,
  dynamicIconImports,
  type IconName,
} from "lucide-react/dynamic";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { iconsData } from "./icons-data";

export type IconData = (typeof iconsData)[number];
const ICON_SKELETON_KEYS = Array.from(
  { length: 40 },
  (_, i) => `icon-skeleton-${i}`,
);

interface IconPickerProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof PopoverTrigger>,
    "onSelect" | "onOpenChange"
  > {
  value?: IconName;
  defaultValue?: IconName;
  onValueChange?: (value: IconName) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  triggerPlaceholder?: string;
  iconsList?: IconData[];
  categorized?: boolean;
  modal?: boolean;
}

const IconRenderer = React.memo(({ name }: { name: IconName }) => {
  return <Icon name={name} />;
});
IconRenderer.displayName = "IconRenderer";

const IconsColumnSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <Skeleton className="h-4 w-1/2 rounded-md" />
      <div className="grid grid-cols-5 gap-2 w-full">
        {ICON_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-10 w-10 rounded-md" />
        ))}
      </div>
    </div>
  );
};

const useIconsData = () => {
  const [icons, setIcons] = useState<IconData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadIcons = async () => {
      setIsLoading(true);

      const { iconsData } = await import("./icons-data");
      if (isMounted) {
        setIcons(
          iconsData.filter((icon: IconData) => {
            return icon.name in dynamicIconImports;
          }),
        );
        setIsLoading(false);
      }
    };

    loadIcons();

    return () => {
      isMounted = false;
    };
  }, []);

  return { icons, isLoading };
};

const IconPicker = React.forwardRef<
  React.ComponentRef<typeof PopoverTrigger>,
  IconPickerProps
>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      open,
      defaultOpen,
      onOpenChange,
      children,
      searchable = true,
      searchPlaceholder = "Search for an icon...",
      triggerPlaceholder = "Select an icon",
      iconsList,
      categorized = true,
      modal = false,
      ...props
    },
    ref,
  ) => {
    const [selectedIcon, setSelectedIcon] = useState<IconName | undefined>(
      defaultValue,
    );
    const [isOpen, setIsOpen] = useState(defaultOpen || false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useDebounceValue("", 100);
    const [hasPointerHover, setHasPointerHover] = useState(false);
    const { icons, isLoading: isIconsLoading } = useIconsData();
    const isOpenControlled = open !== undefined;
    const popoverOpen = isOpenControlled ? open : isOpen;
    const activeIcon = value || selectedIcon;

    const iconsToUse = useMemo(() => iconsList || icons, [iconsList, icons]);

    const fuseInstance = useMemo(() => {
      return new Fuse(iconsToUse, {
        keys: ["name", "tags", "categories"],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true,
      });
    }, [iconsToUse]);

    const filteredIcons = useMemo(() => {
      if (search.trim() === "") {
        return iconsToUse;
      }

      const results = fuseInstance.search(search.toLowerCase().trim());
      return results.map((result) => result.item);
    }, [search, iconsToUse, fuseInstance]);

    const categorizedIcons = useMemo(() => {
      if (!categorized || search.trim() !== "") {
        return [{ name: "All Icons", icons: filteredIcons }];
      }

      const categories = new Map<string, IconData[]>();

      const pushCategoryIcon = (category: string, icon: IconData) => {
        const existingIcons = categories.get(category);
        if (existingIcons) {
          existingIcons.push(icon);
          return;
        }
        categories.set(category, [icon]);
      };

      filteredIcons.forEach((icon) => {
        if (icon.categories && icon.categories.length > 0) {
          icon.categories.forEach((category) => {
            pushCategoryIcon(category, icon);
          });
        } else {
          pushCategoryIcon("Other", icon);
        }
      });

      return Array.from(categories.entries())
        .map(([name, icons]) => ({ name, icons }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredIcons, categorized, search]);

    const virtualItems = useMemo(() => {
      const items: Array<{
        type: "category" | "row";
        categoryIndex: number;
        rowIndex?: number;
        icons?: IconData[];
      }> = [];

      categorizedIcons.forEach((category, categoryIndex) => {
        items.push({ type: "category", categoryIndex });

        const rows = [];
        for (let i = 0; i < category.icons.length; i += 5) {
          rows.push(category.icons.slice(i, i + 5));
        }

        rows.forEach((rowIcons, rowIndex) => {
          items.push({
            type: "row",
            categoryIndex,
            rowIndex,
            icons: rowIcons,
          });
        });
      });

      return items;
    }, [categorizedIcons]);

    const categoryIndices = useMemo(() => {
      const indices: Record<string, number> = {};

      virtualItems.forEach((item, index) => {
        if (item.type === "category") {
          indices[categorizedIcons[item.categoryIndex].name] = index;
        }
      });

      return indices;
    }, [virtualItems, categorizedIcons]);

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      count: virtualItems.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) =>
        virtualItems[index].type === "category" ? 25 : 40,
      paddingEnd: 2,
      gap: 10,
      overscan: 5,
    });

    const handleValueChange = useCallback(
      (icon: IconName) => {
        if (value === undefined) {
          setSelectedIcon(icon);
        }
        onValueChange?.(icon);
      },
      [value, onValueChange],
    );

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setSearchInput("");
        setSearch("");
        if (!isOpenControlled) {
          setIsOpen(newOpen);
        }
        onOpenChange?.(newOpen);
      },
      [isOpenControlled, onOpenChange, setSearch],
    );

    const handleIconClick = useCallback(
      (iconName: IconName) => {
        handleValueChange(iconName);
        handleOpenChange(false);
      },
      [handleOpenChange, handleValueChange],
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = e.target.value;
        setSearchInput(nextValue);
        setSearch(nextValue);

        if (parentRef.current) {
          parentRef.current.scrollTop = 0;
        }

        virtualizer.scrollToOffset(0);
      },
      [setSearch, virtualizer],
    );

    const scrollToCategory = useCallback(
      (categoryName: string) => {
        const categoryIndex = categoryIndices[categoryName];

        if (categoryIndex !== undefined && virtualizer) {
          virtualizer.scrollToIndex(categoryIndex, {
            align: "start",
            behavior: "smooth",
          });
        }
      },
      [categoryIndices, virtualizer],
    );

    const categoryButtons = useMemo(() => {
      if (!categorized || search.trim() !== "") return null;

      return categorizedIcons.map((category) => (
        <Button
          key={category.name}
          variant={"ghost"}
          size="sm"
          className="h-7 rounded-full border px-3 text-xs capitalize hover:border-primary/40 hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            scrollToCategory(category.name);
          }}
        >
          {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
        </Button>
      ));
    }, [categorizedIcons, scrollToCategory, categorized, search]);

    const renderIcon = useCallback(
      (icon: IconData) => {
        const iconName = icon.name as IconName;
        const iconButton = (
          <button
            type="button"
            aria-label={icon.name}
            className={cn(
              "flex items-center justify-center rounded-xl border p-2.5 transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-sm",
              activeIcon === iconName
                ? "border-primary bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25"
                : "border-border/80 bg-background/60",
            )}
            onClick={() => handleIconClick(iconName)}
          >
            <IconRenderer name={iconName} />
          </button>
        );

        if (!hasPointerHover) {
          return iconButton;
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>{iconButton}</TooltipTrigger>
            <TooltipContent>
              <p>{icon.name}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      [activeIcon, handleIconClick, hasPointerHover],
    );

    const renderVirtualContent = useCallback(() => {
      if (filteredIcons.length === 0) {
        return <div className="text-center text-gray-500">No icon found</div>;
      }

      return (
        <div
          className="relative w-full overscroll-contain"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
            const item = virtualItems[virtualItem.index];

            if (!item) return null;

            const itemStyle = {
              position: "absolute" as const,
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            };

            if (item.type === "category") {
              return (
                <div
                  key={virtualItem.key}
                  style={itemStyle}
                  className="z-10 top-0 bg-background/90 pb-1 backdrop-blur-sm"
                >
                  <h3 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    {categorizedIcons[item.categoryIndex].name}
                  </h3>
                  <div className="h-px bg-foreground/10 w-full" />
                </div>
              );
            }

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                style={itemStyle}
              >
                {(() => {
                  const rowIcons = item.icons ?? [];
                  return (
                    <div className="grid grid-cols-5 gap-2 w-full">
                      {rowIcons.map((icon) => (
                        <React.Fragment key={icon.name}>
                          {renderIcon(icon)}
                        </React.Fragment>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      );
    }, [
      virtualizer,
      virtualItems,
      categorizedIcons,
      filteredIcons,
      renderIcon,
    ]);

    React.useEffect(() => {
      if (!popoverOpen) {
        return;
      }

      const frame = requestAnimationFrame(() => {
        virtualizer.measure();
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }, [popoverOpen, virtualizer]);

    React.useEffect(() => {
      if (!popoverOpen || !parentRef.current) {
        return;
      }

      const resizeObserver = new ResizeObserver(() => {
        virtualizer.measure();
      });

      resizeObserver.observe(parentRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, [popoverOpen, virtualizer]);

    React.useEffect(() => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return;
      }

      const mediaQuery = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      );
      const updateHoverSupport = () => {
        setHasPointerHover(mediaQuery.matches);
      };

      updateHoverSupport();

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", updateHoverSupport);
        return () =>
          mediaQuery.removeEventListener("change", updateHoverSupport);
      }

      mediaQuery.addListener(updateHoverSupport);
      return () => mediaQuery.removeListener(updateHoverSupport);
    }, []);

    return (
      <Popover open={popoverOpen} onOpenChange={handleOpenChange} modal={modal}>
        <PopoverTrigger ref={ref} asChild {...props}>
          {children || (
            <Button className="justify-start gap-2" variant="outline">
              {activeIcon ? (
                <>
                  <Icon name={activeIcon} />
                  <span className="capitalize">{activeIcon}</span>
                </>
              ) : (
                triggerPlaceholder
              )}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 rounded-2xl border-border/60 bg-popover/95 p-3 shadow-2xl backdrop-blur-xl">
          {searchable && (
            <Input
              value={searchInput}
              placeholder={searchPlaceholder}
              onChange={handleSearchChange}
              className="mb-2 border-border/70 bg-background/70"
            />
          )}
          {categorized && search.trim() === "" && (
            <div className="mt-2 flex flex-row gap-1 overflow-x-auto pb-2">
              {categoryButtons}
            </div>
          )}
          <div
            ref={parentRef}
            className="h-72 overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-xl border border-border/50 bg-background/40 p-2 touch-pan-y"
            onWheelCapture={(event) => {
              event.stopPropagation();
            }}
            onTouchMoveCapture={(event) => {
              event.stopPropagation();
            }}
            style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
          >
            {isIconsLoading ? (
              <IconsColumnSkeleton />
            ) : hasPointerHover ? (
              <TooltipProvider>{renderVirtualContent()}</TooltipProvider>
            ) : (
              renderVirtualContent()
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
IconPicker.displayName = "IconPicker";

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const Icon = React.forwardRef<React.ComponentRef<LucideIcon>, IconProps>(
  ({ name, ...props }, ref) => {
    return <DynamicIcon name={name} {...props} ref={ref} />;
  },
);
Icon.displayName = "Icon";

export { IconPicker, Icon, type IconName };
