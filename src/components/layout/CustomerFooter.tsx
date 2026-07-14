import Link from "next/link";

export default function CustomerFooter() {
    return (
        <footer className="border-t">
            <div className="mx-auto max-w-7xl px-6 py-12">
                <div className="grid gap-10 md:grid-cols-3">
                    <div>
                        <Link
                            href="/"
                            className="text-xl font-bold tracking-tight"
                        >
                            QueueFlow
                        </Link>

                        <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
                            Digital queues built to give
                            people their waiting time back.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium">
                            Customers
                        </h3>

                        <div className="mt-4 flex flex-col gap-3">
                            <Link
                                href="/customer"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Find a Queue
                            </Link>

                            <Link
                                href="/track"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Track Token
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium">
                            Organizations
                        </h3>

                        <div className="mt-4 flex flex-col gap-3">
                            <Link
                                href="/login"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Organization Login
                            </Link>

                            <Link
                                href="/register"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Create Organization
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-12 border-t pt-6 text-sm text-muted-foreground">
                    © 2026 QueueFlow
                </div>
            </div>
        </footer>
    );
}