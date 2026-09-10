import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from "typeorm";

@Entity({ name: "user_server_subscription" })
@Unique(["userId", "serverId"])
export class UserServerSubscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  userId!: string;

  @Index()
  @Column({ type: "varchar" })
  serverId!: string;

  @Column({ type: "varchar", nullable: true })
  webhookUrl!: string | null;

  @Column({ type: "boolean", default: true })
  notifyLevelUp!: boolean;

  @Column({ type: "boolean", default: true })
  notifyLevelDown!: boolean;

  @Column({ type: "boolean", default: true })
  notifyDeath!: boolean;

  @Column({ type: "boolean", default: true })
  notifyGuildSync!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
