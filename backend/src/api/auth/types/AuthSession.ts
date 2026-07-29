export interface AuthSession {
    user: {
        username: string;
        email: string;
        id: number;
        profile_picture_url: string | null;
        role: {
            id: number;
            name: string;
            permissions: Record<string, boolean>;
        } | null;
        storeMemberships: Array<{
            store_id: number;
            store: {
                id: number;
                name: string;
                slug: string;
                description: string | null;
            };
            jobTitle: string | null;
            permissions: Record<string, boolean>;
        }>;
    },
    accessToken: string;
    refreshToken: string;
    createdAt: number;
    accessExpiresAt: number;
    refreshExpiresAt: number;
}
