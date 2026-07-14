"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";

import { queueService } from "@/services/queue.service";
import { tokenService } from "@/services/token.service";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Page() {
    const { queueId } = useParams<{ queueId: string }>();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    const {
        data: queue,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["queue", queueId],

        queryFn: async () => {
            const res =
                await queueService.getQueue(
                    queueId
                );

            if (!res.data.success) {
                throw new Error(
                    res.data.message
                );
            }

            return res.data.data;
        },

        enabled: Boolean(queueId),
    });

    const joinQueueMutation = useMutation({
        mutationFn: async () => {
            const res =
                await tokenService.joinQueue(queueId, {
                    name,
                    email,
                    phoneNumber,
                });

            if (!res.data.success) {
                throw new Error(
                    res.data.message
                );
            }

            return res.data.data;
        },

        onSuccess: (token) => {
            console.log(token)
            router.push(
                `/customer/${token._id}`
            );
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        joinQueueMutation.mutate();
    };

    if (isLoading) {
        return (
            <p className="p-6">
                Loading queue...
            </p>
        );
    }

    if (error instanceof Error) {
        return (
            <p className="p-6 text-destructive">
                {error.message}
            </p>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            <Card>
                <CardHeader>
                    <CardTitle>
                        {queue.name}
                    </CardTitle>

                    <CardDescription>
                        Enter your details to join
                        this queue.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <Input
                            placeholder="Name"
                            value={name}
                            onChange={(e) =>
                                setName(
                                    e.target.value
                                )
                            }
                        />

                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                        />

                        <Input
                            placeholder="Phone"
                            value={phoneNumber}
                            onChange={(e) =>
                                setPhoneNumber(
                                    e.target.value
                                )
                            }
                        />

                        {joinQueueMutation.error instanceof
                            Error && (
                                <p className="text-sm text-destructive">
                                    {
                                        joinQueueMutation
                                            .error.message
                                    }
                                </p>
                            )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={
                                joinQueueMutation.isPending
                            }
                        >
                            {joinQueueMutation.isPending
                                ? "Joining..."
                                : "Join Queue"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}