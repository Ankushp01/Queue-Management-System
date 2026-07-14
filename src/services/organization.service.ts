import api from "@/lib/axios";

export const organizationService = {
    searchOrganizations(query: string) {
        return api.get(
            "/organizations/search",
            {
                params: {
                    q: query,
                },
            }
        );
    },

    getOrganization(
        organizationId: string
    ) {
        return api.get(
            `/organizations/${organizationId}`
        );
    },

    getOrganizationQueues(
        organizationId: string
    ) {
        return api.get(
            `/organizations/${organizationId}/queues`
        );
    },
};