import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { InitiativeBrief } from "./types";

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepIdea({ brief, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Define your idea</h3>
        <p className="text-sm text-muted-foreground mt-1">Tell us what you want to build. Be as specific as you can.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Project Name</Label>
          <Input
            value={brief.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. ClinicFlow, TaskBoard Pro"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Short Description</Label>
          <Textarea
            value={brief.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A SaaS platform that helps small clinics manage appointments, patients, and billing in one place."
            className="min-h-[70px] text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Problem Being Solved</Label>
          <Textarea
            value={brief.problem_statement}
            onChange={(e) => onChange({ problem_statement: e.target.value })}
            placeholder="Small clinics waste 5+ hours/week on manual scheduling and paper-based patient records."
            className="min-h-[60px] text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Input
            value={brief.target_audience}
            onChange={(e) => onChange({ target_audience: e.target.value })}
            placeholder="e.g. Small clinic owners, solo practitioners, healthcare administrators"
          />
        </div>
      </div>
    </div>
  );
}
