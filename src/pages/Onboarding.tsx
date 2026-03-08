import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOnboardingStarter } from "@/hooks/useOnboardingStarter";
import { useNavigate } from "react-router-dom";
import {
  Rocket, Lightbulb, ArrowRight, CheckCircle2, Sparkles, Search,
  Layers, Zap, Package, AlertTriangle, ChevronRight,
} from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const {
    templates,
    verticals,
    selectedTemplate,
    setSelectedTemplate,
    selectedVertical,
    setSelectedVertical,
    ideaText,
    setIdeaText,
    recommendedTemplate,
    recommendedVertical,
    clearSelections,
  } = useOnboardingStarter();

  const [step, setStep] = useState<"start" | "templates" | "verticals" | "confirm">("start");

  const handleStartWithIdea = () => {
    if (ideaText.length >= 10) setStep("templates");
  };

  const handleSelectTemplate = (t: typeof templates[0]) => {
    setSelectedTemplate(t);
    setStep("confirm");
  };

  const handleSelectVertical = (v: typeof verticals[0]) => {
    setSelectedVertical(v);
    setStep("confirm");
  };

  const handleLaunch = () => {
    // Navigate to initiatives with pre-filled data
    navigate("/initiatives", { state: { ideaText, template: selectedTemplate, vertical: selectedVertical } });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Start Here</h1>
            <p className="text-sm text-muted-foreground">Turn your idea into deployed software</p>
          </div>
        </div>

        <Tabs value={step} onValueChange={(v) => setStep(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="start" className="gap-2"><Lightbulb className="h-4 w-4" /> Idea</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><Package className="h-4 w-4" /> Templates</TabsTrigger>
            <TabsTrigger value="verticals" className="gap-2"><Layers className="h-4 w-4" /> Verticals</TabsTrigger>
            <TabsTrigger value="confirm" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Confirm</TabsTrigger>
          </TabsList>

          {/* Step 1: Idea Input */}
          <TabsContent value="start" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What do you want to build?</CardTitle>
                <CardDescription>Describe your idea in a few sentences. We'll help you get started.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="e.g. A SaaS platform for managing team subscriptions with billing..."
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  className="text-base"
                />
                <div className="flex items-center gap-3">
                  <Button onClick={handleStartWithIdea} disabled={ideaText.length < 10} className="gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{ideaText.length}/10+ characters</span>
                </div>

                {recommendedTemplate && (
                  <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Recommended: {recommendedTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">{recommendedTemplate.description}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleSelectTemplate(recommendedTemplate)}>
                      Use This
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Or start from a template or vertical</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep("templates")}>Browse Templates</Button>
                <Button variant="outline" size="sm" onClick={() => setStep("verticals")}>Browse Verticals</Button>
              </div>
            </div>
          </TabsContent>

          {/* Step 2: Template Picker */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pick a Template</CardTitle>
                <CardDescription>Reusable starting points for common product types.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
                          selectedTemplate?.id === t.id ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        onClick={() => handleSelectTemplate(t)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{t.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{t.name}</h3>
                              <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                              {recommendedTemplate?.id === t.id && (
                                <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Recommended</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Complexity: {t.discoveryHints.complexity}</span>
                              <span>Risk: {t.discoveryHints.riskLevel}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Vertical Starters */}
          <TabsContent value="verticals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choose a Vertical</CardTitle>
                <CardDescription>Domain-specific starter packs with pre-configured templates and stack.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3">
                    {verticals.map((v) => (
                      <div
                        key={v.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
                          selectedVertical?.id === v.id ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        onClick={() => handleSelectVertical(v)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{v.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{v.name}</h3>
                              <Badge variant="secondary" className="text-xs">{v.category}</Badge>
                              {recommendedVertical?.id === v.id && (
                                <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Recommended</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {v.includedTemplates.map((tid) => (
                                <Badge key={tid} variant="outline" className="text-xs">{tid}</Badge>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Confirm & Launch */}
          <TabsContent value="confirm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review & Launch</CardTitle>
                <CardDescription>Review your selections before creating the initiative.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ideaText && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Your Idea</p>
                    <p className="text-sm">{ideaText}</p>
                  </div>
                )}

                {selectedTemplate && (
                  <div className="p-3 rounded-lg border flex items-center gap-3">
                    <span className="text-2xl">{selectedTemplate.icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Template</p>
                      <p className="font-medium">{selectedTemplate.name}</p>
                    </div>
                  </div>
                )}

                {selectedVertical && (
                  <div className="p-3 rounded-lg border flex items-center gap-3">
                    <span className="text-2xl">{selectedVertical.icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Vertical</p>
                      <p className="font-medium">{selectedVertical.name}</p>
                    </div>
                  </div>
                )}

                {selectedTemplate && selectedTemplate.discoveryHints && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                      <p className="text-sm font-medium text-accent-foreground">Assumptions</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• MVP Scope: {selectedTemplate.discoveryHints.mvpScope}</li>
                      <li>• Stack: {selectedTemplate.discoveryHints.suggestedStack}</li>
                      <li>• Target: {selectedTemplate.discoveryHints.targetUser}</li>
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <Button onClick={handleLaunch} className="gap-2">
                    <Rocket className="h-4 w-4" /> Create Initiative
                  </Button>
                  <Button variant="outline" onClick={clearSelections}>
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
