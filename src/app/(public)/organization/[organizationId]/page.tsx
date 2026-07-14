import { notFound } from "next/navigation";

import {
    getPublicOrganization,
    getPublicOrganizationQueues,
} from "@/services/organization.server";

import PublicQueueCard from "@/components/queue/PublicQueueCard";

import { Organization } from "@/types/organization";
import { Queue } from "@/types/queue";

interface OrganizationPageProps {
    params: Promise<{
        organizationId: string;
    }>;
}

export default async function OrganizationPage({
    params,
}: OrganizationPageProps) {
    const { organizationId } =
        await params;

    let organization: Organization;
    let queues: Queue[];

    try {
        [organization, queues] =
            await Promise.all([
                getPublicOrganization(
                    organizationId
                ),

                getPublicOrganizationQueues(
                    organizationId
                ),
            ]);
    } catch (error) {
        console.error(error);

        notFound();
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
            <section className="space-y-4">
                <div>
                    <h1 className="text-4xl font-bold">
                        {organization.name}
                    </h1>

                    <p className="mt-2 text-muted-foreground">
                        View available queues and
                        join digitally.
                    </p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                        {organization.email}
                    </p>

                    {organization.phone && (
                        <p>
                            {organization.phone}
                        </p>
                    )}

                    {organization.address && (
                        <p>
                            {organization.address}
                        </p>
                    )}
                </div>
            </section>

            <section className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold">
                        Available Queues
                    </h2>

                    <p className="mt-2 text-muted-foreground">
                        Select a queue to receive
                        your digital token.
                    </p>
                </div>

                {queues.length === 0 ? (
                    <div className="rounded-xl border p-8 text-center">
                        <p className="text-muted-foreground">
                            This organization has no
                            available queues.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {queues.map((queue) => (
                            <PublicQueueCard
                                key={queue._id}
                                queue={queue}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}