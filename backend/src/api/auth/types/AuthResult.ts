import { AuthSession } from "./AuthSession";

export type AuthResult =
    | { success: false; message: string }
    | { success: true; message: string; user: AuthSession["user"] };