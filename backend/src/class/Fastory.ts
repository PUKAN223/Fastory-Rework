import { Elysia } from "elysia";
import pino, { Logger } from "pino";
import "colors";

import { AuthRoutes } from "../api/auth/routes";
import { ProductsRoutes } from "../api/products/routes";
import { CategoriesRoutes } from "../api/categories/routes";
import { ImagesRoutes } from "../api/image/routes";
import { LocationsRoutes } from "../api/locations/routes";
import { RolesRoutes } from "../api/roles/routes";
import { StoresRoutes } from "../api/stores/routes";
import { UsersRoutes } from "../api/users/routes";
import { StocksRoutes } from "../api/stocks/routes";
import { StoreMembersRoutes } from "../api/stores/members";
import { SalesRoutes } from "../api/sales/routes";
import { WebhooksRoutes } from "../api/webhooks/routes";
import { AIRoutes } from "../api/ai/routes";

class Fastory {
    private app: Elysia;
    private logger: Logger;
    private groups = [
        { prefix: "/auth", router: AuthRoutes },
        { prefix: "/stores", router: StoresRoutes },
        { prefix: "/stores/:storeId/products", router: ProductsRoutes },
        { prefix: "/stores/:storeId/categories", router: CategoriesRoutes },
        { prefix: "/stores/:storeId/locations", router: LocationsRoutes },
        { prefix: "/stores/:storeId/stocks", router: StocksRoutes },
        { prefix: "/stores/:storeId/members", router: StoreMembersRoutes },
        { prefix: "/stores/:storeId/sales", router: SalesRoutes },
        { prefix: "/stores/:storeId/ai", router: AIRoutes },
        { prefix: "/webhooks", router: WebhooksRoutes },
        { prefix: "/images", router: ImagesRoutes },
        { prefix: "/roles", router: RolesRoutes },
        { prefix: "/users", router: UsersRoutes }
    ]

    constructor() {
        this.app = new Elysia();
        this.app.group("/api/v1", (app) => {
            for (const group of this.groups) {
                app.use(new group.router(group.prefix).getRouter());
            }
            return app;
        });

        this.logger = pino({
            level: process.env.NODE_ENV === "production" ? "info" : "debug",
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true
                }
            }
        })
    }

    public start(port: number) {
        this.app.listen(port, () => {
            this.logger.info(
                `API is running at http://${this.app.server?.hostname}:${this.app.server?.port}`
            );
            this.groups.forEach((group) => {
                const routerInstance = new group.router(group.prefix);
                const routes = routerInstance.getRouter().router.history;
                routes.forEach((route) => {
                    this.logger.debug(`[${group.prefix}] ${route.method.yellow} ${route.path.gray}`);
                });
            });
        });
    }
}

export default Fastory;
