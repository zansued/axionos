import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers } from "lucide-react";

interface InitiativeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function InitiativeFilter({ value, onChange, className }: InitiativeFilterProps) {
  const { currentOrg } = useOrg();

  const { data: initiatives = [] } = useQuery({
    queryKey: ["initiatives-filter", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initiatives")
        .select("id, title, stage_status")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (initiatives.length === 0) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || "w-[220px]"}>
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Todas iniciativas" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas iniciativas</SelectItem>
        {initiatives.map((init) => (
          <SelectItem key={init.id} value={init.id}>
            {init.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
