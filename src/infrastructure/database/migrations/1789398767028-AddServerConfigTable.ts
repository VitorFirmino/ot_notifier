import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddServerConfigTable1789398767028 implements MigrationInterface {
    name = 'AddServerConfigTable1789398767028'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "server_config" ("serverId" character varying NOT NULL, "serverName" character varying NOT NULL, "guild" jsonb NOT NULL, "characters" jsonb NOT NULL DEFAULT '{}', "settings" jsonb, "createdByUserId" character varying, "isWorking" boolean, "lastWorkingTest" TIMESTAMP WITH TIME ZONE, "hasCloudflare" boolean, "cloudflareDetectedAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b1056350ea666ee06ff0ee42e6" PRIMARY KEY ("serverId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "server_config"`);
    }

}
