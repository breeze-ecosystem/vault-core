"use client";

import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick}>
          <action.icon className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
