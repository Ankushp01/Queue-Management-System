import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function CustomerHeader() {
    return (
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <Link
                    href="/"
                    className="text-3xl font-italic-bold tracking-tight"
                >
                    QueueFlow
                </Link>

                <nav className="hidden items-center gap-8 md:flex">
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Home
                    </Link>
                    <Link
                        href="/customer"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Find a Queue
                    </Link>

                    <Link
                        href="/customer/track"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Track Token
                    </Link>
                </nav>

                <Button
                    variant="ghost"
                    asChild
                >
                    <Link href="/login">
                        For Organizations
                        <ArrowRight className="ml-1 size-4" />
                    </Link>
                </Button>
            </div>
        </header>
    );
}