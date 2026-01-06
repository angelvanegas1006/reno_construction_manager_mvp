"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/appointments-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PartnerHomeTasksProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const ITEMS_PER_PAGE = 7;

export function PartnerHomeTasks({ tasks, onTaskClick }: PartnerHomeTasksProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"priority" | "normal">("priority");
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const priorityTasks = useMemo(() => 
    tasks.filter((t) => t.isPriority), 
    [tasks]
  );
  
  const normalTasks = useMemo(() => 
    tasks.filter((t) => !t.isPriority), 
    [tasks]
  );

  const displayedTasks = useMemo(() => {
    const tasksToShow = activeTab === "priority" ? priorityTasks : normalTasks;
    return tasksToShow.slice(0, displayedCount);
  }, [activeTab, priorityTasks, normalTasks, displayedCount]);

  // Reset displayed count when tab changes
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [activeTab]);

  // Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop <= clientHeight + 50) {
        // Near bottom, load more
        const tasksToShow = activeTab === "priority" ? priorityTasks : normalTasks;
        if (displayedCount < tasksToShow.length) {
          setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, tasksToShow.length));
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeTab, priorityTasks, normalTasks, displayedCount]);

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t.dashboard.pendingTasks}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.pendingTasksDescription}
        </p>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab("priority")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "priority"
                ? "border-[var(--prophero-blue-500)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.dashboard.priority} ({priorityTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("normal")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "normal"
                ? "border-[var(--prophero-blue-500)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.dashboard.normal} ({normalTasks.length})
          </button>
        </div>

        {/* Tasks List */}
        <div 
          ref={scrollContainerRef}
          className="space-y-3 max-h-[400px] overflow-y-auto"
        >
          {displayedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay tareas {activeTab === "priority" ? "prioritarias" : "normales"}
            </p>
          ) : (
            displayedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[var(--prophero-gray-800)] cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">{t.dashboard.dueToday}</p>
                  )}
                </div>
                {task.isCritical && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 flex-shrink-0"
                  >
                    {t.dashboard.criticalBlocker}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

