import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Organization } from "@/types/organization";

interface Props {
    organization: Organization;

    onClick: () => void;
}

export default function OrganizationCard({
    organization,
    onClick,
}: Props) {
    return (
        <Card
            onClick={onClick}
            className="cursor-pointer hover:shadow-lg transition"
        >
            <CardHeader>

                <CardTitle>
                    {organization.name}
                </CardTitle>

            </CardHeader>
        </Card>
    );
}