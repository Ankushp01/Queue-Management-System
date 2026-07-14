import Link from "next/link";

export default function DashboardSidebar() {
    return (
        <aside className="w-64 min-h-[calc(100vh-4rem)] border-r p-6">
            <nav className="space-y-2">
                <Link
                    href="/dashboard/queues"
                    className="block rounded-md px-3 py-2 hover:bg-muted"
                >
                    Queues
                </Link>

                <Link
                    href="/dashboard/queues/create-queue"
                    className="block rounded-md px-3 py-2 hover:bg-muted"
                >
                    Create Queue
                </Link>

                <Link
                    href="/dashboard/organization"
                    className="block rounded-md px-3 py-2 hover:bg-muted"
                >
                    Organization
                </Link>
            </nav>
        </aside>
    );
}