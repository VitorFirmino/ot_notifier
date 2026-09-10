import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitUserServerSubscription1788953138219 implements MigrationInterface {
    name = 'InitUserServerSubscription1788953138219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_server_subscription" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "serverId" character varying NOT NULL, "webhookUrl" character varying, "notifyLevelUp" boolean NOT NULL DEFAULT true, "notifyLevelDown" boolean NOT NULL DEFAULT true, "notifyDeath" boolean NOT NULL DEFAULT true, "notifyGuildSync" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_28c9c62a25de8e474e5a28f0885" UNIQUE ("userId", "serverId"), CONSTRAINT "PK_5332f6c4a1907111d9c1054a4ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ec68e7e72b93e7c83b5d476a8b" ON "user_server_subscription"  ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_502d7647f6aaad90e1a5cac041" ON "user_server_subscription"  ("serverId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_502d7647f6aaad90e1a5cac041"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec68e7e72b93e7c83b5d476a8b"`);
        await queryRunner.query(`DROP TABLE "user_server_subscription"`);
    }

}
