import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserServerSubscriptionUserForeignKey1788999791442 implements MigrationInterface {
    name = 'AddUserServerSubscriptionUserForeignKey1788999791442'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_server_subscription" ADD CONSTRAINT "FK_user_server_subscription_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_server_subscription" DROP CONSTRAINT "FK_user_server_subscription_userId"`);
    }

}
