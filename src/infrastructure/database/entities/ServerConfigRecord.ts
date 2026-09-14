import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

@Entity({ name: "server_config" })
export class ServerConfigRecord {
  @PrimaryColumn({ type: "varchar" })
  serverId!: string;

  @Column({ type: "varchar" })
  serverName!: string;

  @Column({ type: "jsonb" })
  guild!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  characters!: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true })
  settings!: Record<string, unknown> | null;

  @Column({ type: "varchar", nullable: true })
  createdByUserId!: string | null;

  @Column({ type: "boolean", nullable: true })
  isWorking!: boolean | null;

  @Column({ type: "timestamptz", nullable: true })
  lastWorkingTest!: Date | null;

  @Column({ type: "boolean", nullable: true })
  hasCloudflare!: boolean | null;

  @Column({ type: "timestamptz", nullable: true })
  cloudflareDetectedAt!: Date | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
