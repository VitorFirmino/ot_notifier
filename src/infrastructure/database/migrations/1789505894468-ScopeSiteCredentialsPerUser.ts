import type { MigrationInterface, QueryRunner } from "typeorm";

export class ScopeSiteCredentialsPerUser1789505894468 implements MigrationInterface {
    name = 'ScopeSiteCredentialsPerUser1789505894468'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_credentials" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "site_credentials" DROP CONSTRAINT "PK_f1e4d5569155afe9df617235ab4"`);
        await queryRunner.query(`ALTER TABLE "site_credentials" ADD CONSTRAINT "PK_df84165e50b5bcbb7cff2cf3c10" PRIMARY KEY ("domain", "userId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_credentials" DROP CONSTRAINT "PK_df84165e50b5bcbb7cff2cf3c10"`);
        await queryRunner.query(`ALTER TABLE "site_credentials" ADD CONSTRAINT "PK_f1e4d5569155afe9df617235ab4" PRIMARY KEY ("domain")`);
        await queryRunner.query(`ALTER TABLE "site_credentials" DROP COLUMN "userId"`);
    }

}
