"use client"

import { queueService } from "@/services/queue.service";
import { useQuery } from "@tanstack/react-query";
import QueueCard from "@/components/ui/queue-card";
import { Queue } from "@/types/queue";

export default function QueuePage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["queues"],
        queryFn: async () => {
            const res = await queueService.getQueues();
            return res.data.data
        }
    })

    console.log(data)

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (error instanceof Error) {
        return <div>{error.message}</div>;
    }

    return (
        <div>
            {data?.map((queue: Queue) => {
                return <QueueCard
                    key={queue._id}
                    queue={queue}
                />
            })}
        </div>
    )
}