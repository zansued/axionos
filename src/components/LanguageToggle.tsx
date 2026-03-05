import { useI18n, type Locale } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const localeLabels: Record<Locale, string> = {
  "pt-BR": "🇧🇷 Português",
  "en-US": "🇺🇸 English",
};

export function LanguageToggle({ collapsed }: { collapsed?: boolean }) {
  const { locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          <Languages className="mr-2 h-4 w-4 shrink-0" />
          {!collapsed && (locale === "pt-BR" ? "🇧🇷 PT" : "🇺🇸 EN")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end">
        {(Object.keys(localeLabels) as Locale[]).map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={locale === l ? "font-semibold" : ""}
          >
            {localeLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
