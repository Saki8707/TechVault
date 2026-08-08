import { redirect } from "next/navigation";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";

    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const callbackUrl = (formData.get("callbackUrl") as string) || "/";

    try {
      await signIn("credentials", {
        username,
        password,
        redirectTo: callbackUrl,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw error;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/40 px-4">
      <Card className="w-full max-w-sm border-border/60 shadow-lg">
        <CardHeader className="justify-items-center text-center space-y-3">
          <Image src={logo} alt="TechVault" priority className="h-14 w-auto" />
          <p className="text-lg font-semibold tracking-tight">
            Tech<span className="text-sky-400">Vault</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Interna baza znanja. Prijavi se svojim nalogom.
          </p>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? "/"} />

            {params.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Pogrešno korisničko ime ili lozinka. Pokušaj ponovo.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Korisničko ime</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="npr. Sandra"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lozinka</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Prijavi se
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
