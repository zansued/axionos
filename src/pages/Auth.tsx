import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import axionLogo from "@/assets/axion-logo.svg";
import { Sparkles } from "lucide-react";

export default function Auth() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const savedIdea = sessionStorage.getItem("axion_initial_idea");

  useEffect(() => {
    if (user) {
      navigate("/builder/projects", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.auth.signOut();
      await signIn(loginEmail, loginPassword);
    } catch (error: any) {
      const msg = error?.message || "";
      const description = msg.includes("Failed to fetch") || msg.includes("NetworkError")
        ? t("auth.networkError")
        : msg.includes("Invalid login")
        ? t("auth.invalidCredentials")
        : msg;
      toast({ variant: "destructive", title: t("auth.loginError"), description });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);
      toast({ title: t("auth.accountCreated"), description: t("auth.confirmEmail") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("auth.signupError"), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: '#08080a' }}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
          style={{
            background: `radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.35) 0%, rgba(20, 136, 252, 0.14) 14%, rgba(20, 136, 252, 0.06) 18%, rgba(20, 136, 252, 0.02) 22%, transparent 25%)`,
            filter: 'blur(4px)',
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(16px)', scale: 0.92 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center"
          >
            <img src={axionLogo} alt="AxionOS Logo" className="h-14 w-14 drop-shadow-[0_0_24px_rgba(20,136,252,0.35)]" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="font-display text-4xl font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-[#4da5fc] via-[#6db8ff] to-[#4da5fc] bg-clip-text text-transparent">
              Axion
            </span>
            <span className="text-white">OS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-2 text-[13px] font-semibold tracking-[0.15em] uppercase text-white"
          >
            {t("auth.autonomousInfra")}
          </motion.p>
        </div>

        {/* Saved idea banner */}
        {savedIdea && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mb-4 w-full rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-primary mb-1">{t("auth.ideaWaiting")}</p>
                <p className="text-[13px] text-white/60 leading-snug line-clamp-2">{savedIdea}</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <Card className="border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg text-white">{t("auth.panelAccess")}</CardTitle>
              <CardDescription style={{ color: '#55555c' }}>{t("auth.panelDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                  <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-white/70">{t("auth.email")}</Label>
                      <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder={t("auth.emailPlaceholder")} className="border-white/[0.1] bg-white/[0.04]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-white/70">{t("auth.password")}</Label>
                      <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••" className="border-white/[0.1] bg-white/[0.04]" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}
                      style={{ background: 'linear-gradient(135deg, #1488fc, #4da5fc)', boxShadow: '0 0 20px rgba(20,136,252,0.3)' }}
                    >
                      {loading ? t("auth.loggingIn") : t("auth.login")}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-white/70">{t("auth.name")}</Label>
                      <Input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder={t("auth.namePlaceholder")} className="border-white/[0.1] bg-white/[0.04]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-white/70">{t("auth.email")}</Label>
                      <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required placeholder={t("auth.emailPlaceholder")} className="border-white/[0.1] bg-white/[0.04]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-white/70">{t("auth.password")}</Label>
                      <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="border-white/[0.1] bg-white/[0.04]" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}
                      style={{ background: 'linear-gradient(135deg, #1488fc, #4da5fc)', boxShadow: '0 0 20px rgba(20,136,252,0.3)' }}
                    >
                      {loading ? t("auth.creatingAccount") : t("auth.signup")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
