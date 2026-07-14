// src/types/queue.ts

export interface Queue {
    _id: string;
    organizationId: string;

    name: string;
    description?: string;

    nextTokenNumber: number;
    currentTokenNumber: number|null;

    status: "working" | "paused" | "break";

    avgServiceTimePerCustomer?: number;

    createdAt: string;
    updatedAt: string;
}