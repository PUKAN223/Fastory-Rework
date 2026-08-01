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
            email: z.string().email(),
            password: z.string().min(1),
            google_id: z.string().optional(),
            profile_picture: z.string().optional(),
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
                            google_id: parsed.data.google_id || null,
                            profile_picture: parsed.data.profile_picture || null,
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
            })
            .get("/google/url", (req) => {
                const clientId = process.env.GOOGLE_CLIENT_ID;
                if (!clientId) {
                    req.set.status = 500;
                    return { success: false, message: "GOOGLE_CLIENT_ID is not configured on server" };
                }
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/api/auth/google/callback`;

                const params = new URLSearchParams({
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    response_type: "code",
                    scope: "openid email profile",
                    prompt: "select_account",
                });

                const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
                return { success: true, url };
            })
            .post("/google/callback", async (req) => {
                const googleCallbackSchema = z.object({
                    code: z.string().min(1),
                    redirectUri: z.string().optional(),
                });

                const parsed = googleCallbackSchema.safeParse(req.body);
                if (!parsed.success) {
                    req.set.status = 400;
                    return { success: false, message: "Invalid callback payload", errors: parsed.error.flatten().fieldErrors };
                }

                const clientId = process.env.GOOGLE_CLIENT_ID;
                const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
                if (!clientId || !clientSecret) {
                    req.set.status = 500;
                    return { success: false, message: "Google OAuth credentials are not configured on server" };
                }

                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                const redirectUri = parsed.data.redirectUri || process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/api/auth/google/callback`;

                try {
                    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            code: parsed.data.code,
                            client_id: clientId,
                            client_secret: clientSecret,
                            redirect_uri: redirectUri,
                            grant_type: "authorization_code",
                        }),
                    });

                    if (!tokenRes.ok) {
                        const tokenErr = await tokenRes.json().catch(() => ({}));
                        req.set.status = 400;
                        return { success: false, message: "Failed to exchange code with Google", details: tokenErr };
                    }

                    const tokenData = (await tokenRes.json()) as { access_token: string; id_token?: string };

                    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                        headers: { Authorization: `Bearer ${tokenData.access_token}` },
                    });

                    if (!userinfoRes.ok) {
                        req.set.status = 400;
                        return { success: false, message: "Failed to fetch Google user profile" };
                    }

                    const profile = (await userinfoRes.json()) as {
                        sub: string;
                        email: string;
                        name?: string;
                        picture?: string;
                    };

                    if (!profile.email) {
                        req.set.status = 400;
                        return { success: false, message: "Google account does not have an email address" };
                    }

                    const defaultRole = await prisma.roles.upsert({
                        where: { name: "User" },
                        update: {},
                        create: { name: "User", permissions: {} },
                    });

                    let user = await prisma.users.findUnique({
                        where: { google_id: profile.sub },
                        include: {
                            roles: true,
                            storeMemberships: { include: { store: true } },
                        },
                    });

                    if (!user) {
                        user = await prisma.users.findUnique({
                            where: { email: profile.email },
                            include: {
                                roles: true,
                                storeMemberships: { include: { store: true } },
                            },
                        });

                        if (user) {
                            user = await prisma.users.update({
                                where: { id: user.id },
                                data: {
                                    google_id: profile.sub,
                                    profile_picture: user.profile_picture || profile.picture,
                                },
                                include: {
                                    roles: true,
                                    storeMemberships: { include: { store: true } },
                                },
                            });
                        } else {
                            req.set.status = 404;
                            return {
                                success: false,
                                notRegistered: true,
                                email: profile.email,
                                name: profile.name || "",
                                picture: profile.picture || "",
                                googleId: profile.sub,
                                message: "ไม่พบบัญชีผู้ใช้นี้ กรุณาสมัครสมาชิกและตั้งรหัสผ่านก่อนเข้าสู่ระบบ",
                            };
                        }
                    }

                    const authUser = this.toAuthUser(user);
                    const session = authSessionStore.create(authUser);

                    return this.toSessionResponse(session);
                } catch (err: any) {
                    req.set.status = 500;
                    return { success: false, message: err?.message || "Google auth error" };
                }
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
            profile_picture_url: user.profile_picture ?? null,
            bio: user.bio ?? null,
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
