import Link from "next/link";

import {
    ArrowRight,
    Building2,
    Clock3,
    Search,
    TicketCheck,
    Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
    return (
        <>
            <section className="relative overflow-hidden">
                <div className="mx-auto max-w-7xl px-6 py-24 md:py-36">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
                            <Clock3 className="mr-2 size-4" />

                            Your time belongs to you.
                        </div>

                        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                            Skip the waiting room.
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                            Join queues from anywhere,
                            receive a digital token, and
                            track your turn in real time.
                        </p>

                        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Button
                                size="lg"
                                className="h-12 px-7"
                                asChild
                            >
                                <Link href="/customer">
                                    Find a Queue

                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>

                            <Button
                                variant="outline"
                                size="lg"
                                className="h-12 px-7"
                                asChild
                            >
                                <Link href="/track">
                                    Track my token
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y bg-muted/30">
                <div className="mx-auto max-w-7xl px-6 py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                            How it works
                        </p>

                        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                            Three steps. No standing
                            around.
                        </h2>
                    </div>

                    <div className="mt-16 grid gap-12 md:grid-cols-3">
                        <div className="space-y-5">
                            <div className="flex size-12 items-center justify-center rounded-xl border bg-background">
                                <Search className="size-5" />
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    01
                                </p>

                                <h3 className="mt-1 text-xl font-semibold">
                                    Find the organization
                                </h3>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    Search for the place you
                                    want to visit and view its
                                    active queues.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="flex size-12 items-center justify-center rounded-xl border bg-background">
                                <TicketCheck className="size-5" />
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    02
                                </p>

                                <h3 className="mt-1 text-xl font-semibold">
                                    Get your digital token
                                </h3>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    Join the queue online and
                                    receive your token without
                                    waiting at the location.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="flex size-12 items-center justify-center rounded-xl border bg-background">
                                <Users className="size-5" />
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    03
                                </p>

                                <h3 className="mt-1 text-xl font-semibold">
                                    Track your turn live
                                </h3>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    See how many people are
                                    ahead and follow queue
                                    movement in real time.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-24">
                <div className="overflow-hidden rounded-3xl border bg-foreground px-8 py-14 text-background md:px-16 md:py-20">
                    <div className="grid items-center gap-12 md:grid-cols-2">
                        <div>
                            <div className="flex size-12 items-center justify-center rounded-xl bg-background/10">
                                <Building2 className="size-5" />
                            </div>

                            <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
                                Run queues without the
                                chaos.
                            </h2>

                            <p className="mt-5 max-w-xl text-lg leading-8 text-background/70">
                                Create queues, manage live
                                customer flow, and call the
                                next token from one simple
                                dashboard.
                            </p>
                        </div>

                        <div className="flex md:justify-end">
                            <Button
                                size="lg"
                                variant="secondary"
                                className="h-12 px-7"
                                asChild
                            >
                                <Link href="/login">
                                    Manage your organization

                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}