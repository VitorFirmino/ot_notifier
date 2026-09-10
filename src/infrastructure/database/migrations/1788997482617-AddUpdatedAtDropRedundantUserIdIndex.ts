import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedAtDropRedundantUserIdIndex1788997482617 implements MigrationInterface {
    name = 'AddUpdatedAtDropRedundantUserIdIndex1788997482617'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ec68e7e72b93e7c83b5d476a8b"`);
        await queryRunner.query(`ALTER TABLE "user_server_subscription" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_server_subscription" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`CREATE INDEX "IDX_ec68e7e72b93e7c83b5d476a8b" ON "user_server_subscription" USING btree ("userId") `);
    }

}
