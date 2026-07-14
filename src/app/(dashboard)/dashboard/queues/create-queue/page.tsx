"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { queueService } from "@/services/queue.service";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CreateQueuePage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [avgServiceTimePerCustomer, setAvgServiceTimePerCustomer] =
        useState("");

    const createQueueMutation = useMutation({
        mutationFn: async () => {
            const response = await queueService.createQueue({
                name,
                description,
                avgServiceTimePerCustomer: Number(
                    avgServiceTimePerCustomer
                ),
            });

            return response.data;
        },

        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["queues"],
            });

            router.push(`/dashboard/queues/${data.data._id}`);
        },

        onError: (error) => {
            console.error(error);
        },
    });

    const handleSubmit = () => {
        if (!name.trim()) {
            return;
        }

        createQueueMutation.mutate();
    };

    return (
        <div className="max-w-xl mx-auto mt-10">
            <Card>
                <CardHeader>
                    <CardTitle>Create Queue</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Input
                        placeholder="Queue Name"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                    />

                    <Input
                        placeholder="Description"
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                    />

                    <Input
                        type="number"
                        placeholder="Average Service Time (minutes)"
                        value={avgServiceTimePerCustomer}
                        onChange={(e) =>
                            setAvgServiceTimePerCustomer(
                                e.target.value
                            )
                        }
                    />

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={createQueueMutation.isPending}
                    >
                        {createQueueMutation.isPending
                            ? "Creating..."
                            : "Create Queue"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}