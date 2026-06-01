import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardShell from "@/components/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      allowedRoles={[
        "coordinator",
        "coordinador",
        "admin",
        "driver",
        "conductor",
        "guardian",
        "acudiente",
      ]}
    >
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}

