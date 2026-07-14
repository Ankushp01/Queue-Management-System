// services/auth.service.ts

import api from "@/lib/axios";

export const authService = {
    register(data: {
        name: string;
        description: string;
        address: string;
        contactNumber: string;
        email: string;
        password: string;
    }) {
        return api.post("/sign-up", data);
    },
};