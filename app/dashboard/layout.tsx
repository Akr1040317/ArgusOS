import DashboardClientLayout from "./DashboardClientLayout"

export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>
}
