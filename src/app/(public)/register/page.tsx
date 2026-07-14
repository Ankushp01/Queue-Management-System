"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { authService } from "@/services/auth.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

export default function SignUpPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        address: "",
        contactNumber: "",
        email: "",
        password: "",
    });

    const registerMutation = useMutation({
        mutationFn: async () => {
            const res = await authService.register(formData);
            return res.data;
        },

        onSuccess: () => {
            router.push("/login");
        },

        onError: (error) => {
            console.error(error);
        },
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = () => {
        if (
            !formData.name ||
            !formData.email ||
            !formData.password ||
            !formData.contactNumber
        ) {
            alert("Please fill all required fields.");
            return;
        }

        registerMutation.mutate();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>Create Organization</CardTitle>

                    <CardDescription>
                        Register your organization to manage queues.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">

                    <Input
                        placeholder="Organization Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                    />

                    <Textarea
                        placeholder="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                    />

                    <Input
                        placeholder="Address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                    />

                    <Input
                        placeholder="Contact Number"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleChange}
                    />

                    <Input
                        placeholder="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <Input
                        placeholder="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                    />

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={registerMutation.isPending}
                    >
                        {registerMutation.isPending
                            ? "Creating..."
                            : "Create Organization"}
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                            router.push("/sign-in")
                        }
                    >
                        Already have an account? Sign In
                    </Button>

                </CardContent>
            </Card>
        </div>
    );
}