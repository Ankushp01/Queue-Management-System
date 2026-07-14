"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError("Invalid email or password");
            return;
        }

        router.push("/dashboard/queues");
        router.refresh();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>
                        Welcome Back
                    </CardTitle>

                    <CardDescription>
                        Sign in to manage your queues.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">

                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />

                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                    />

                    {error && (
                        <p className="text-sm text-red-500">
                            {error}
                        </p>
                    )}

                    <Button
                        className="w-full"
                        disabled={loading}
                        onClick={handleLogin}
                    >
                        {loading
                            ? "Signing In..."
                            : "Sign In"}
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                            router.push("/register")
                        }
                    >
                        Create Organization
                    </Button>

                </CardContent>
            </Card>
        </div>
    );
}