import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "site_credentials" })
export class SiteCredential {
  @PrimaryColumn({ type: "varchar" })
  userId!: string;

  @PrimaryColumn({ type: "varchar" })
  domain!: string;

  @Column({ type: "varchar" })
  loginUrl!: string;

  @Column({ type: "varchar" })
  username!: string;

  @Column({ type: "varchar" })
  encryptedPassword!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
