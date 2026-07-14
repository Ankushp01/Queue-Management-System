"use client";

import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function DashboardHeader() {
    const { data: session } = useSession();

    return (
        <header className="h-16 border-b">
            <div className="h-full px-6 flex items-center justify-between">
                <h1 className="text-xl font-bold">
                    QueueFlow
                </h1>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        {session?.user?.email}
                    </span>

                    <Button
                        variant="outline"
                        onClick={() =>
                            signOut({
                                callbackUrl: "/login",
                            })
                        }
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </header>
    );
}