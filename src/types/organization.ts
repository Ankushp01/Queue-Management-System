// types/organization.ts

export interface Organization {
    _id: string;

    name: string;

    email: string;

    phone?: string;

    address?: string;
}