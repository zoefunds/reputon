/**
 * Reputon Postgres schema.
 *
 * One schema file for the whole protocol. Tables split into three layers:
 *   1. Auth (Auth.js v5 adapter tables + wallet links)
 *   2. Reputation (profiles, scores, history, endorsements, evaluations)
 *   3. Protocol extras (NFT credentials, sybil flags, governance, contributions,
 *      audit log)
 */

import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  uuid,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
  serial,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const trustCategoryEnum = pgEnum("trust_category", [
  "unverified",
  "emerging",
  "trusted",
  "eminent",
]);

export const evaluationKindEnum = pgEnum("evaluation_kind", [
  "wallet_activity",
  "governance",
  "contribution",
  "endorsement",
  "sybil_check",
  "full_recompute",
]);

export const sybilSeverityEnum = pgEnum("sybil_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const auditActorEnum = pgEnum("audit_actor", [
  "user",
  "system",
  "admin",
]);

/* ------------------------------------------------------------------ */
/* 1. Auth.js tables                                                  */
/*    These names + columns are required by @auth/drizzle-adapter.    */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  })
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.credentialID] }),
  })
);

/* ------------------------------------------------------------------ */
/* 1b. Wallet links (one user → many wallets, optional)               */
/* ------------------------------------------------------------------ */

export const wallets = pgTable(
  "wallet",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    address: varchar("address", { length: 64 }).notNull(),
    chain: varchar("chain", { length: 32 }).notNull().default("genlayer"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    addressIdx: uniqueIndex("wallet_address_chain_uidx").on(t.address, t.chain),
    userIdx: index("wallet_user_idx").on(t.userId),
  })
);

/* ------------------------------------------------------------------ */
/* 2. Reputation core                                                  */
/* ------------------------------------------------------------------ */

export const profiles = pgTable(
  "profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    address: varchar("address", { length: 64 }).notNull(),
    chain: varchar("chain", { length: 32 }).notNull().default("genlayer"),
    displayName: varchar("display_name", { length: 80 }),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    // Latest snapshot cached for fast reads. Source of truth is score_history.
    score: integer("score").notNull().default(0),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull().default("0.000"),
    category: trustCategoryEnum("category").notNull().default("unverified"),
    onchainContract: varchar("onchain_contract", { length: 64 }),
    onchainTxHash: varchar("onchain_tx_hash", { length: 80 }),
    lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    addrChainUidx: uniqueIndex("profile_address_chain_uidx").on(
      t.address,
      t.chain
    ),
    scoreIdx: index("profile_score_idx").on(t.score),
  })
);

export const scoreHistory = pgTable(
  "score_history",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    category: trustCategoryEnum("category").notNull(),
    delta: integer("delta").notNull().default(0),
    reason: text("reason"),
    breakdown: jsonb("breakdown"),
    evaluationId: uuid("evaluation_id"),
    onchainTxHash: varchar("onchain_tx_hash", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdx: index("score_history_profile_idx").on(t.profileId),
    createdIdx: index("score_history_created_idx").on(t.createdAt),
  })
);

export const endorsements = pgTable(
  "endorsement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromProfile: uuid("from_profile")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    toProfile: uuid("to_profile")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull().default(1),
    note: text("note"),
    onchainTxHash: varchar("onchain_tx_hash", { length: 80 }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    fromIdx: index("endorsement_from_idx").on(t.fromProfile),
    toIdx: index("endorsement_to_idx").on(t.toProfile),
    pairUidx: uniqueIndex("endorsement_pair_uidx").on(
      t.fromProfile,
      t.toProfile
    ),
  })
);

export const evaluations = pgTable(
  "evaluation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: evaluationKindEnum("kind").notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    aiModel: varchar("ai_model", { length: 80 }),
    aiExplanation: text("ai_explanation"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    scoreDelta: integer("score_delta").notNull().default(0),
    onchainTxHash: varchar("onchain_tx_hash", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdx: index("evaluation_profile_idx").on(t.profileId),
    kindIdx: index("evaluation_kind_idx").on(t.kind),
  })
);

/* ------------------------------------------------------------------ */
/* 3. Protocol extras                                                  */
/* ------------------------------------------------------------------ */

export const nftCredentials = pgTable(
  "nft_credential",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenId: varchar("token_id", { length: 80 }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    metadataUrl: text("metadata_url"),
    tier: varchar("tier", { length: 32 }),
    onchainTxHash: varchar("onchain_tx_hash", { length: 80 }),
    mintedAt: timestamp("minted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdx: index("nft_profile_idx").on(t.profileId),
  })
);

export const sybilFlags = pgTable(
  "sybil_flag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    severity: sybilSeverityEnum("severity").notNull(),
    reason: text("reason").notNull(),
    evidence: jsonb("evidence"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdx: index("sybil_profile_idx").on(t.profileId),
    severityIdx: index("sybil_severity_idx").on(t.severity),
  })
);

export const governanceRecords = pgTable(
  "governance_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    daoName: varchar("dao_name", { length: 120 }).notNull(),
    proposalId: varchar("proposal_id", { length: 120 }).notNull(),
    role: varchar("role", { length: 32 }).notNull(), // voter | author
    decision: varchar("decision", { length: 32 }), // yes | no | abstain
    qualityScore: integer("quality_score"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdx: index("gov_profile_idx").on(t.profileId),
    daoIdx: index("gov_dao_idx").on(t.daoName),
  })
);

export const contributions = pgTable(
  "contribution",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 32 }).notNull(), // github | content | community | protocol | education
    referenceUrl: text("reference_url"),
    title: varchar("title", { length: 240 }),
    summary: text("summary"),
    aiQuality: integer("ai_quality"),
    aiExplanation: text("ai_explanation"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdx: index("contribution_profile_idx").on(t.profileId),
    sourceIdx: index("contribution_source_idx").on(t.source),
  })
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actor: auditActorEnum("actor").notNull(),
    actorId: text("actor_id"),
    action: varchar("action", { length: 80 }).notNull(),
    target: varchar("target", { length: 120 }),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    actorIdx: index("audit_actor_idx").on(t.actor, t.actorId),
    actionIdx: index("audit_action_idx").on(t.action),
  })
);

/* ------------------------------------------------------------------ */
/* 4. API surface (keys, webhooks, deliveries)                         */
/* ------------------------------------------------------------------ */

export const apiKeyEnvEnum = pgEnum("api_key_env", ["test", "live"]);

export const apiKeys = pgTable(
  "api_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    env: apiKeyEnvEnum("env").notNull().default("test"),
    prefix: varchar("prefix", { length: 16 }).notNull(), // first ~12 chars shown to UI
    hashedSecret: varchar("hashed_secret", { length: 128 }).notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("api_key_user_idx").on(t.userId),
    prefixUidx: uniqueIndex("api_key_prefix_uidx").on(t.prefix),
    hashUidx: uniqueIndex("api_key_hashed_secret_uidx").on(t.hashedSecret),
  })
);

export const webhooks = pgTable(
  "webhook",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 80 }).notNull(),
    eventTypes: jsonb("event_types").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    failCount: integer("fail_count").notNull().default(0),
    lastStatus: integer("last_status"),
    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("webhook_user_idx").on(t.userId),
  })
);

export const webhookDeliveries = pgTable(
  "webhook_delivery",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 80 }).notNull(),
    payload: jsonb("payload"),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    attempt: integer("attempt").notNull().default(1),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    webhookIdx: index("webhook_delivery_webhook_idx").on(t.webhookId),
    eventIdx: index("webhook_delivery_event_idx").on(t.event),
  })
);

export const evaluationJobs = pgTable(
  "evaluation_job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    address: varchar("address", { length: 64 }).notNull(),
    chain: varchar("chain", { length: 32 }).notNull().default("genlayer"),
    signals: jsonb("signals"),
    status: varchar("status", { length: 24 }).notNull().default("queued"), // queued | running | done | failed
    onchainTxHash: varchar("onchain_tx_hash", { length: 80 }),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusIdx: index("eval_job_status_idx").on(t.status),
    addressIdx: index("eval_job_address_idx").on(t.address),
  })
);

/* ------------------------------------------------------------------ */
/* Inferred row types                                                  */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ScoreHistory = typeof scoreHistory.$inferSelect;
export type NewScoreHistory = typeof scoreHistory.$inferInsert;

export type Endorsement = typeof endorsements.$inferSelect;
export type NewEndorsement = typeof endorsements.$inferInsert;

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;

export type NftCredential = typeof nftCredentials.$inferSelect;
export type SybilFlag = typeof sybilFlags.$inferSelect;
export type GovernanceRecord = typeof governanceRecords.$inferSelect;
export type Contribution = typeof contributions.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type EvaluationJob = typeof evaluationJobs.$inferSelect;
export type NewEvaluationJob = typeof evaluationJobs.$inferInsert;
