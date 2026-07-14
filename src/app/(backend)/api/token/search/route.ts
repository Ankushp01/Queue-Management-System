import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectdb } from "@/lib/connectdb";
import Token from "@/models/token.model";

export async function GET(request:Request) {
    try {
        await connectdb();

        const { searchParams } =
            new URL(request.url);

        const type = searchParams.get("type");
        const value = searchParams
            .get("value")
            ?.trim();

        if (!type || !value) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Search type and value are required",
                },
                {
                    status: 400,
                }
            );
        }

        const allowedSearchTypes = [
            "tokenId",
            "email",
            "phone",
        ];

        if (!allowedSearchTypes.includes(type)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid search type",
                },
                {
                    status: 400,
                }
            );
        }

        let query;

        switch (type) {
            case "tokenId": {
                if (
                    !mongoose.Types.ObjectId.isValid(
                        value
                    )
                ) {
                    return NextResponse.json(
                        {
                            success: true,
                            data: [],
                        },
                        {
                            status: 200,
                        }
                    );
                }

                query = {
                    _id: value,
                };

                break;
            }

            case "email": {
                query = {
                    email: value.toLowerCase(),
                };

                break;
            }

            case "phone": {
                query = {
                    phone: value,
                };

                break;
            }
        }

        const tokens = await Token.find(query)
            .sort({
                createdAt: -1,
            })
            .lean();

        return NextResponse.json(
            {
                success: true,
                data: tokens,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "TOKEN_SEARCH_ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: "Failed to search tokens",
            },
            {
                status: 500,
            }
        );
    }
}