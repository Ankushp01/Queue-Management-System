"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Queue } from "@/types/queue";
import { useRouter } from "next/navigation";

interface PublicQueueCardProps {
    queue: Queue;
}

export default function PublicQueueCard({
    queue,
}: PublicQueueCardProps) {
    const canJoin =
        queue.status === "working";

    const router = useRouter()
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle>
                            {queue.name}
                        </CardTitle>

                        <CardDescription>
                            {queue.description ||
                                "No description available"}
                        </CardDescription>
                    </div>

                    <Badge
                        variant={
                            queue.status === "working"
                                ? "default"
                                : "secondary"
                        }
                    >
                        {queue.status}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                    <p>
                        <span className="font-medium">
                            Current Token:
                        </span>{" "}
                        {queue.currentTokenNumber ??
                            "Not started"}
                    </p>

                    <p>
                        <span className="font-medium">
                            Average Service Time:
                        </span>{" "}
                        {queue.avgServiceTimePerCustomer
                            ? `${queue.avgServiceTimePerCustomer} mins`
                            : "Not available"}
                    </p>
                </div>

                <Button
                    className="w-full"
                    disabled={!canJoin}
                    onClick={
                        ()=>router.push(`/queue/${queue._id}`)
                    }
                >
                    {canJoin
                        ? "Join Queue"
                        : "Queue Unavailable"}
                </Button>
            </CardContent>
        </Card>
    );
}