"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { tokenService } from "@/services/token.service";

import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

export default function Page() {
    const router = useRouter();

    const [searchType, setSearchType] =
        useState("tokenId");

    const [searchValue, setSearchValue] =
        useState("");

    const [
        submittedSearchValue,
        setSubmittedSearchValue,
    ] = useState("");

    const {
        data: tokens = [],
        isFetching,
        error,
    } = useQuery({
        queryKey: [
            "tokens",
            searchType,
            submittedSearchValue,
        ],

        queryFn: async () => {
            const res =
                await tokenService.searchTokens({
                    type: searchType,
                    value: submittedSearchValue,
                });

            if (!res.data.success) {
                throw new Error(
                    res.data.message
                );
            }

            return res.data.data;
        },

        enabled: Boolean(submittedSearchValue),
    });

    const handleSearch = () => {
        const value = searchValue.trim();

        if (!value) return;

        setSubmittedSearchValue(value);
    };

    const handleSearchTypeChange = (value) => {
        setSearchType(value);
        setSearchValue("");
        setSubmittedSearchValue("");
    };

    interface placeholder{
        tokenId:string,
        email:string,
        phone:string
    }

    const placeholders:placeholder = {
        tokenId: "Enter token ID...",
        email: "Enter email address...",
        phone: "Enter phone number...",
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold">
                    Track Your Token
                </h1>

                <p className="text-muted-foreground">
                    Search using your token ID,
                    email, or phone number.
                </p>
            </div>

            <div className="space-y-4">
                <Tabs
                    value={searchType}
                    onValueChange={
                        handleSearchTypeChange
                    }
                >
                    <TabsList>
                        <TabsTrigger value="tokenId">
                            Token ID
                        </TabsTrigger>

                        <TabsTrigger value="email">
                            Email
                        </TabsTrigger>

                        <TabsTrigger value="phone">
                            Phone
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex gap-3">
                    <Input
                        placeholder={
                            placeholders[searchType]
                        }
                        value={searchValue}
                        onChange={(e) =>
                            setSearchValue(
                                e.target.value
                            )
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />

                    <Button
                        onClick={handleSearch}
                        disabled={
                            !searchValue.trim() ||
                            isFetching
                        }
                    >
                        {isFetching
                            ? "Searching..."
                            : "Search"}
                    </Button>
                </div>
            </div>

            {error instanceof Error && (
                <p className="text-destructive">
                    {error.message}
                </p>
            )}

            {!isFetching &&
                submittedSearchValue &&
                tokens.length === 0 && (
                    <p className="text-muted-foreground">
                        No tokens found.
                    </p>
                )}

            <div className="space-y-4">
                {tokens.map((token) => (
                    <Card
                        key={token._id}
                        className="cursor-pointer transition hover:shadow-md"
                        onClick={() =>
                            router.push(
                                `/token/${token._id}`
                            )
                        }
                    >
                        <CardHeader>
                            <CardTitle>
                                Token #
                                {token.tokenNumber}
                            </CardTitle>

                            <CardDescription>
                                Status: {token.status}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}