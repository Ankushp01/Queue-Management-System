// src/services/queue.service.ts

import api from "@/lib/axios";

export const queueService = {
    getQueues() {
        return api.get("/queues");
    },

    getQueue(queueId: string) {
        const res = api.get(`/queues/${queueId}`);
        console.log(res);
        return res
    },

    createQueue(data: any) {
        return api.post("/queues", data);
    },

    updateQueueStatus(
        queueId: string,
        status: string
    ) {
        return api.patch(
            `/queues/${queueId}/status`,
            { status }
        );
    },
    // queue.service.ts

    deleteQueue(queueId: string) {
        return api.delete(
            `/queues/${queueId}`
        );
    },

    serveToken(queueId: string) {
        return api.post(
            `/queues/${queueId}/serve`
        );
    },

    callNextToken(queueId: string) {
        return api.post(
            `/queues/${queueId}/next`
        );
    },

    skipToken(queueId: string) {
        return api.post(
            `/queues/${queueId}/skip`
        );
    },
};