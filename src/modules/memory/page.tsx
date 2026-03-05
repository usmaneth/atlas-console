"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Search } from "lucide-react";

const categories = ["People", "Decisions", "Repos", "Ideas", "Roadmap"];

export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Memory</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search memory..."
            className="pl-9 pr-4 py-2 bg-secondary rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-64"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant="secondary"
            className="cursor-pointer hover:bg-accent transition-colors"
          >
            {cat}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            All Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Brain className="h-10 w-10 mb-4 opacity-30" />
            <p className="text-sm font-medium">No memory entries loaded</p>
            <p className="text-xs mt-1">
              Connect to the gateway to browse Atlas&apos;s knowledge base
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
