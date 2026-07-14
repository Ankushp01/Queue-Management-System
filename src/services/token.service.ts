import api from "@/lib/axios";

interface JoinQueueData {
    name: string;
    email: string;
    phoneNumber: string;
}

export const tokenService = {
    joinQueue(
        queueId: string,
        data: JoinQueueData
    ) {
        return api.post(
            `/queues/${queueId}/join`,
            data
        );
    },
    searchTokens({ type, value }:{type:string,value:string}) {
        type = encodeURIComponent(type)
        value = encodeURI(value)
        return api.get("/tokens/search", {
            params: {
                type,
                value,
            },
        });
    },
    getToken(tokenId: string) {
        return api.get(
            `/token/${tokenId}`
        );
    },
};