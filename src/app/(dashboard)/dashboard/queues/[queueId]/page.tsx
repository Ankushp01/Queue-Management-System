"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queueService } from "@/services/queue.service";
import { Queue } from "@/types/queue";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

export default function QueueDetailsPage() {
    const { queueId } = useParams<{
        queueId: string;
    }>();

    const queryClient = useQueryClient();

    const router = useRouter();

    const {
        data: queue,
        isLoading,
        error,
    } = useQuery<Queue>({
        queryKey: ["queue", queueId],
        queryFn: async () => {
            const res = await queueService.getQueue(queueId);

            console.log("Axios response:", res);
            // console.log("Response body:", res.data);
            // console.log("Response data:", res.data.data);

            return res.data.data;
        }
    });

    const refreshQueue = () => {
        queryClient.invalidateQueries({
            queryKey: ["queue", queueId],
        });

        queryClient.invalidateQueries({
            queryKey: ["queues"],
        });
    };

    const updateQueueMutation = useMutation({
        mutationFn: async (status: string) => {
            const res = await queueService.updateQueueStatus(queueId, status)
            return res.data
        },
        onSuccess: refreshQueue,

        onError: (error) => {
            console.error(error);
        },
    })

    const callNextMutation = useMutation({
        mutationFn: async () => {
            const res = await queueService.callNextToken(queueId)
            return res.data
        },
        onSuccess: refreshQueue,
        onError: (error) => {
            console.error(error);
        },
    })

    const serveMutation = useMutation({
        mutationFn: async () => {
            const res = await queueService.serveToken(queueId)
            return res.data
        },
        onSuccess: refreshQueue,
        onError: (error) => {
            console.error(error);
        },
    })

    const skipMutation = useMutation({
        mutationFn: async () => {
            const res = await queueService.skipToken(queueId)
            return res.data
        },
        onSuccess: refreshQueue,
        onError: (error) => {
            console.error(error);
        },
    })

    const deleteQueueMutation = useMutation({
        mutationFn: async () => {
            const res =
                await queueService.deleteQueue(
                    queueId
                );

            return res.data;
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["queues"],
            });

            router.push(
                "/dashboard/queues"
            );
        },
    });

    useEffect(() => {
        const source = new EventSource(
            `/api/queues/${queueId}/events`
        );

        source.onmessage = (event) => {
            const data = JSON.parse(event.data);

            console.log("SSE:", data);

            queryClient.invalidateQueries({
                queryKey: ["queue", queueId],
            });

            queryClient.invalidateQueries({
                queryKey: ["queues"],
            });
        };

        source.onerror = (error) => {
            console.error("SSE Error", error);
        };

        return () => {
            source.close();
        };
    }, [queueId, queryClient]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                Loading...
            </div>
        );
    }

    if (error instanceof Error) {
        return (
            <div className="text-red-500">
                {error.message}
            </div>
        );
    }

    if (!queue) {
        return (
            <div>
                Queue not found
            </div>
        );
    }


    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {queue.name}
                            </CardTitle>

                            <CardDescription>
                                {queue.description ||
                                    "No description"}
                            </CardDescription>
                        </div>

                        <Badge>
                            {queue.status}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    <p>
                        <strong>
                            Current Token:
                        </strong>{" "}
                        {queue.currentTokenNumber ??
                            "Not Started"}
                    </p>

                    <p>
                        <strong>
                            Next Token:
                        </strong>{" "}
                        {queue.nextTokenNumber}
                    </p>

                    <p>
                        <strong>
                            Avg Service Time:
                        </strong>{" "}
                        {queue.avgServiceTimePerCustomer
                            ? `${queue.avgServiceTimePerCustomer} mins`
                            : "Not Set"}
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Current Token
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="text-3xl font-bold">
                            {queue.currentTokenNumber ??
                                "-"}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Token Actions
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex gap-2 flex-wrap">

                        {queue.currentTokenNumber !== null ? (
                            <>
                                <Button
                                    disabled={
                                        serveMutation.isPending ||
                                        queue.status !== "working"
                                    }
                                    onClick={() =>
                                        serveMutation.mutate()
                                    }
                                >
                                    Serve Current
                                </Button>

                                <Button
                                    disabled={
                                        skipMutation.isPending ||
                                        queue.status !== "working"
                                    }
                                    onClick={() =>
                                        skipMutation.mutate()
                                    }
                                >
                                    Skip
                                </Button>

                                <Button
                                    disabled={
                                        callNextMutation.isPending ||
                                        queue.status !== "working"
                                    }
                                    onClick={() =>
                                        callNextMutation.mutate()
                                    }
                                >
                                    Call Next
                                </Button>
                            </>
                        ) : (
                            <Button
                                disabled={
                                    callNextMutation.isPending ||
                                    queue.status !== "working"
                                }
                                onClick={() =>
                                    callNextMutation.mutate()
                                }
                            >
                                Start Queue
                            </Button>
                        )}

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Queue Controls
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex gap-2 flex-wrap">

                        {queue.status !== "paused" && (
                            <Button
                                onClick={() =>
                                    updateQueueMutation.mutate(
                                        "paused"
                                    )
                                }
                            >
                                Pause
                            </Button>
                        )}

                        {queue.status !== "break" && (
                            <Button
                                onClick={() =>
                                    updateQueueMutation.mutate(
                                        "break"
                                    )
                                }
                            >
                                Break
                            </Button>
                        )}

                        {queue.status !== "working" && (
                            <Button
                                onClick={() =>
                                    updateQueueMutation.mutate(
                                        "working"
                                    )
                                }
                            >
                                Resume
                            </Button>
                        )}

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Danger Zone
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <Button
                            variant="destructive"
                            disabled={
                                deleteQueueMutation.isPending
                            }
                            onClick={() => {
                                const confirmed =
                                    window.confirm(
                                        "Delete this queue?"
                                    );

                                if (confirmed) {
                                    deleteQueueMutation.mutate();
                                }
                            }}
                        >
                            Delete Queue
                        </Button>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}