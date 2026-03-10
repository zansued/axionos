/**
 * PlaceholderPage — Structural placeholder for blueprint screens not yet implemented.
 * Shows the screen name, purpose, and planned components.
 * Used during UI architecture phase to establish navigation completeness.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction, ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  category?: string;
  plannedComponents?: string[];
  plannedActions?: string[];
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon = Construction,
  category = "Blueprint",
  plannedComponents = [],
  plannedActions = [],
}: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-display font-semibold tracking-tight">{title}</h1>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-axion-purple/30 text-axion-purple">
            {category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground ml-11">{description}</p>
      </div>

      {/* Status Card */}
      <Card className="border-border/40 bg-card/80 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Construction className="h-4 w-4 text-warning" />
            Screen Under Construction
          </CardTitle>
          <CardDescription>
            This screen is defined in the AxionOS UI Blueprint and will be implemented in a future sprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plannedComponents.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Planned Components
              </p>
              <div className="flex flex-wrap gap-1.5">
                {plannedComponents.map((c) => (
                  <Badge key={c} variant="secondary" className="text-[11px] font-mono">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {plannedActions.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Primary Actions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {plannedActions.map((a) => (
                  <Badge key={a} variant="outline" className="text-[11px]">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
