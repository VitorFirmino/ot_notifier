import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSiteCredentialsTable1789503604111 implements MigrationInterface {
    name = 'AddSiteCredentialsTable1789503604111'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "site_credentials" ("domain" character varying NOT NULL, "loginUrl" character varying NOT NULL, "username" character varying NOT NULL, "encryptedPassword" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f1e4d5569155afe9df617235ab4" PRIMARY KEY ("domain"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "site_credentials"`);
    }

}
