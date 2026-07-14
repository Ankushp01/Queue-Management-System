"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { tokenService } from "@/services/token.service";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Page() {
    const { tokenId } = useParams<{
        tokenId: string;
    }>();

    const queryClient = useQueryClient();

    const {
        data: token,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["token", tokenId],
        queryFn: async () => {
            const res =
                await tokenService.getToken(
                    tokenId
                );

            if (!res.data.success) {
                throw new Error(res.data.message);
            }

            return res.data.data;
        },
    });

    useEffect(() => {
        if (!token?.queueId) return;

        const source = new EventSource(
            `/api/queues/${token.queueId}/events`
        );

        source.onopen = () => {
            console.log("SSE connected");
        };
        
        source.onmessage = () => {
            queryClient.invalidateQueries({
                queryKey: ["token", tokenId],
            });
        };

        source.onerror = () => {
            console.log(
                "SSE reconnecting...",
                source.readyState
            );
        };

        return () => {
            source.close();
        };
    }, [
        token?.queueId,
        tokenId,
        queryClient,
    ]);

    if (isLoading) {
        return (
            <div>
                Loading...
            </div>
        );
    }

    if (error instanceof Error) {
        return (
            <div>
                {error.message}
            </div>
        );
    }

    if (!token) {
        return (
            <div>
                Token not found
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">

            <div className="grid gap-4 md:grid-cols-2">

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Your Token
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="text-5xl font-bold">
                            {token.tokenNumber}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Status
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="text-2xl font-semibold">
                            {token.status}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            People Ahead
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="text-5xl font-bold">
                            {token.peopleAhead}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Estimated Wait
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="text-5xl font-bold">
                            {token.waitingTime}
                        </div>

                        <p className="text-sm text-muted-foreground">
                            minutes
                        </p>
                    </CardContent>
                </Card>

            </div>

        </div>
    );
}