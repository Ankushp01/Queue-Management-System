const BASE_URL =
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

export async function getPublicOrganization(
    organizationId: string
) {
    const res = await fetch(
        `${BASE_URL}/api/organizations/${organizationId}`,
        {
            cache: "no-store",
        }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch organization"
        );
    }

    return data.data;
}

export async function getPublicOrganizationQueues(
    organizationId: string
) {
    const res = await fetch(
        `${BASE_URL}/api/organizations/${organizationId}/queues`,
        {
            cache: "no-store",
        }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch queues"
        );
    }

    return data.data;
}