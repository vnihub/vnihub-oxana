import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
