import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserServerSubscription } from "./entities/UserServerSubscription";
import { ServerConfigRecord } from "./entities/ServerConfigRecord";
import { SiteCredential } from "./entities/SiteCredential";
import { getAuthEnv } from "@shared/utils/authEnv";

const { DATABASE_URL } = getAuthEnv();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: DATABASE_URL,
  entities: [UserServerSubscription, ServerConfigRecord, SiteCredential],
  migrations: [`${import.meta.dirname}/migrations/*.ts`],
  synchronize: false,
  logging: false,
  extra: { max: 5 },
});
