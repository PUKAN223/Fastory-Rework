import { Elysia } from "elysia";
import pino from "pino";

class BaseRouter {
    public router: Elysia<string>;
    public logger: pino.Logger; 
    
    constructor(prefix: string) {
        this.router = new Elysia<string>({ prefix });
        this.logger = pino({
            level: process.env.NODE_ENV === "production" ? "info" : "debug",
            transport: { 
                target: "pino-pretty",
                options: {
                    colorize: true,
                }
            } 
        });
    }

    public getRouter() {
        return this.router;
    }
}

export default BaseRouter;