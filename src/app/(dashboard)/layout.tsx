import DashboardHeader from "@/components/layout/dashboard-header";
import DashboardSidebar from "@/components/layout/dashboard-sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <DashboardHeader />

            <div className="flex">
                <DashboardSidebar />

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}