"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { tokenService } from "@/services/token.service";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinQueueDialogProps {
    queueId: string;
    queueName: string;
    disabled?: boolean;
}

export default function JoinQueueDialog({
    queueId,
    queueName,
    disabled = false,
}: JoinQueueDialogProps) {
    const router = useRouter();

    const [open, setOpen] = useState(false);

    const [name, setName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [phoneNumber, setPhoneNumber] =
        useState("");

    const joinMutation = useMutation({
        mutationFn: async () => {
            const res =
                await tokenService.joinQueue(
                    queueId,
                    {
                        name,
                        email,
                        phoneNumber,
                    }
                );

            return res.data;
        },

        onSuccess: (data) => {
            router.push(
                `/token/${data.data._id}`
            );
        },

        onError: (error) => {
            console.error(
                "Join queue error:",
                error
            );
        },
    });

    const handleJoin = () => {
        if (
            !name.trim() ||
            !email.trim() ||
            !phoneNumber.trim()
        ) {
            return;
        }

        joinMutation.mutate();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger asChild>
                <Button
                    className="w-full"
                    disabled={disabled}
                >
                    {disabled
                        ? "Queue Unavailable"
                        : "Join Queue"}
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Join {queueName}
                    </DialogTitle>

                    <DialogDescription>
                        Enter your details to
                        receive a digital token.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Name
                        </Label>

                        <Input
                            id="name"
                            value={name}
                            onChange={(e) =>
                                setName(
                                    e.target.value
                                )
                            }
                            placeholder="Enter your name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">
                            Email
                        </Label>

                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">
                            Phone Number
                        </Label>

                        <Input
                            id="phoneNumber"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) =>
                                setPhoneNumber(
                                    e.target.value
                                )
                            }
                            placeholder="Enter your phone number"
                        />
                    </div>

                    {joinMutation.isError && (
                        <p className="text-sm text-destructive">
                            {joinMutation.error instanceof
                            Error
                                ? joinMutation.error
                                      .message
                                : "Failed to join queue"}
                        </p>
                    )}

                    <Button
                        className="w-full"
                        disabled={
                            joinMutation.isPending
                        }
                        onClick={handleJoin}
                    >
                        {joinMutation.isPending
                            ? "Joining..."
                            : "Join Queue"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}