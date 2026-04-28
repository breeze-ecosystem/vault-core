"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ProtectedLayout } from "@/components/protected-layout";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ProtectedLayout>
        <DashboardLayout>{children}</DashboardLayout>
      </ProtectedLayout>
    </AuthProvider>
  );
}
