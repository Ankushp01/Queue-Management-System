"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";

import { organizationService } from "@/services/organization.service";

import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

interface OrganizationSearchResult {
    _id: string;
    name: string;
}

export default function CustomerPage() {
    const router = useRouter();

    const [search, setSearch] = useState("");

    const [debouncedValue] = useDebounce(
        search,
        1000
    );

    const {
        data: organizations = [],
        isLoading,
        error,
    } = useQuery<OrganizationSearchResult[]>({
        queryKey: [
            "organizations",
            debouncedValue,
        ],

        enabled:
            debouncedValue.trim().length > 0,

        queryFn: async () => {
            const res =
                await organizationService.searchOrganizations(
                    debouncedValue
                );

            if (!res.data.success) {
                throw new Error(
                    res.data.message
                );
            }

            return res.data.data;
        },
    });

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

            <div className="space-y-2">
                <h1 className="text-4xl font-bold">
                    Find an Organization
                </h1>

                <p className="text-muted-foreground">
                    Search for an organization
                    and view its available queues.
                </p>
            </div>

            <Input
                placeholder="Search organization..."
                value={search}
                onChange={(e) =>
                    setSearch(e.target.value)
                }
            />

            {isLoading && (
                <p className="text-muted-foreground">
                    Searching...
                </p>
            )}

            {error instanceof Error && (
                <p className="text-destructive">
                    {error.message}
                </p>
            )}

            {!isLoading &&
                debouncedValue &&
                organizations.length === 0 && (
                    <p className="text-muted-foreground">
                        No organizations found.
                    </p>
                )}

            <div className="space-y-4">
                {organizations.map(
                    (organization) => (
                        <Card
                            key={organization._id}
                            className="cursor-pointer transition hover:shadow-md"
                            onClick={() =>
                                router.push(
                                    `/organization/${organization._id}`
                                )
                            }
                        >
                            <CardHeader>
                                <CardTitle>
                                    {
                                        organization.name
                                    }
                                </CardTitle>

                                <CardDescription>
                                    View organization
                                    and available queues
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )
                )}
            </div>

        </div>
    );
}