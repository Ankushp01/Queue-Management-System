import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Queue } from "@/types/queue";
import Link from "next/link";

interface QueueCardProps {
    queue: Queue
}

export default function QueueCard({
    queue,
}: QueueCardProps) {
    return (
        <Link
            href={`/dashboard/queues/${queue._id}`}
            className="block"
        >
            <Card className="hover:shadow-md transition cursor-pointer">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>
                            {queue.name}
                        </CardTitle>

                        <Badge>
                            {queue.status}
                        </Badge>
                    </div>

                    <CardDescription>
                        {queue.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                    <p>
                        Current Token: {queue.currentTokenNumber ?? "Not Started yet"}
                    </p>

                    <p>
                        Next Token: {queue.nextTokenNumber}
                    </p>

                    <p>
                        Avg Service Time:
                        {
                            queue.avgServiceTimePerCustomer
                                ? `${queue.avgServiceTimePerCustomer} mins`
                                : "Not Set"
                        }
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}