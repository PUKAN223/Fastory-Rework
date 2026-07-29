import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";

import type { AuthRequestBody } from "./types/AuthRequestBody";
import { AuthResult } from "./types/AuthResult";
import { authSessionStore } from "./sessionStore";
import type { AuthSession } from "./types/AuthSession";
import { getAccessToken } from "./permissions";

class AuthRoutes extends BaseRouter {
    public override getRouter() {
        const registerSchema = z.object({
            username: z.string().min(1),
            email: z.email(),
            password: z.string().min(1),
        });

        const refreshSchema = z.object({
            refreshToken: z.string().min(1),
        });

        const logoutSchema = z.object({
            refreshToken: z.string().min(1).optional(),
        });

        return super.getRouter()
            .post("/register", async (req) => {
                const parsed = registerSchema.safeParse(req.body);
                if (!parsed.success) {
                    req.set.status = 400;
                    return {
                        success: false,
                        message: "Invalid request body",
                        errors: parsed.error.flatten().fieldErrors,
                    };
                }

                const defaultRole = await prisma.roles.upsert({
                    where: { name: "User" },
                    update: {},
                    create: { name: "User", permissions: {} },
                });

                try {
                    const user = await prisma.users.create({
                        data: {
                            username: parsed.data.username,
                            email: parsed.data.email,
                            password_hash: parsed.data.password,
                            role_id: defaultRole.id,
                        },
                        include: {
                            roles: true,
                            storeMemberships: { include: { store: true } },
                        },
                    });

                    const authUser = this.toAuthUser(user);
                    const session = authSessionStore.create(authUser);

                    return this.toSessionResponse(session);
                } catch {
                    req.set.status = 409;
                    return { success: false, message: "Email or username already exists" };
                }
            })
            .post("/login", async (req) => {
                const { email, password } = req.body as AuthRequestBody;
                const auth = await this.authenticate(email, password);

                if (!auth.success) {
                    req.set.status = 401;
                    return auth;
                }

                const session = authSessionStore.create(auth.user);

                return this.toSessionResponse(session);
            })
            .post("/refresh", (req) => {
                const parsed = refreshSchema.safeParse(req.body);
                if (!parsed.success) {
                    req.set.status = 400;
                    return { success: false, message: "Invalid refresh token payload" };
                }

                const session = authSessionStore.rotateFromRefreshToken(parsed.data.refreshToken);
                if (!session) {
                    req.set.status = 401;
                    return { success: false, message: "Invalid or expired refresh token" };
                }

                return {
                    accessToken: session.accessToken,
                    refreshToken: session.refreshToken,
                };
            })
            .post("/logout", (req) => {
                const accessToken = getAccessToken(req.headers.authorization);
                const parsed = logoutSchema.safeParse(req.body ?? {});

                if (!parsed.success) {
                    req.set.status = 400;
                    return { success: false, message: "Invalid logout payload" };
                }

                if (!accessToken && !parsed.data.refreshToken) {
                    req.set.status = 401;
                    return { success: false, message: "Missing token for logout" };
                }

                const removedByAccess = accessToken
                    ? authSessionStore.deleteByAccessToken(accessToken)
                    : false;
                const removedByRefresh = parsed.data.refreshToken
                    ? authSessionStore.deleteByRefreshToken(parsed.data.refreshToken)
                    : false;

                if (!removedByAccess && !removedByRefresh) {
                    req.set.status = 401;
                    return { success: false, message: "Invalid token for logout" };
                }

                return { success: true };
            })
            .get("/me", ({ headers, set }) => {
                const token = getAccessToken(headers.authorization);

                if (!token) {
                    set.status = 401;
                    return { success: false, message: "Missing access token" };
                }

                const session = authSessionStore.getByAccessToken(token);
                if (!session) {
                    set.status = 401;
                    return { success: false, message: "Invalid or expired access token" };
                }

                return {
                    user: session.user,
                    stores: this.toStoreList(session.user),
                };
            });
    }

    private async authenticate(email: string, password: string): Promise<AuthResult> {
        const user = await prisma.users.findFirst({
            where: { email, password_hash: password },
            include: {
                roles: true,
                storeMemberships: { include: { store: true } },
            },
        })

        if (!user) return { success: false, message: "Invalid email or password" };

        return {
            success: true,
            message: "Authentication successful",
            user: this.toAuthUser(user),
        }
    }

    private toAuthUser(user: any): AuthSession["user"] {
        return {
            email: user.email,
            username: user.username,
            id: Number(user.id),
            profile_picture_url: null,
            role: user.roles
                ? {
                    id: Number(user.roles.id),
                    name: user.roles.name,
                    permissions: (user.roles.permissions ?? {}) as Record<string, boolean>,
                }
                : null,
            storeMemberships: (user.storeMemberships ?? []).map((member: any) => ({
                store_id: Number(member.store_id),
                store: {
                    id: Number(member.store.id),
                    name: member.store.name,
                    slug: member.store.slug,
                    description: member.store.description ?? null,
                },
                jobTitle: member.job_title ?? null,
                permissions: (member.permissions ?? {}) as Record<string, boolean>,
            })),
        };
    }

    private toStoreList(user: AuthSession["user"]) {
        return user.storeMemberships.map((membership) => ({
            id: membership.store.id,
            name: membership.store.name,
            slug: membership.store.slug,
            description: membership.store.description,
            jobTitle: membership.jobTitle,
            permissions: membership.permissions,
        }));
    }

    private toSessionResponse(session: AuthSession) {
        return {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: session.user,
            stores: this.toStoreList(session.user),
        };
    }
}

export { AuthRoutes }
