import { sql } from "drizzle-orm";
import { boolean, customType, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  toDriver: (v) => v,
  fromDriver: (v) => Buffer.from(v as Uint8Array),
});

const id = () => uuid("id").primaryKey().defaultRandom();
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const ts = (n: string) => timestamp(n, { withTimezone: true });

export type Role =
  | "super_admin" | "curriculum_admin" | "content_editor" | "teacher" | "parent" | "student"
  | "org_admin" | "finance_admin" | "media_admin" | "developer_admin";
export type ContentStatus = "draft" | "review" | "approved" | "published" | "archived";
export type ReviewStatus = "unreviewed" | "in_review" | "approved" | "changes_requested";

// ───────────────────────────── identity & organisations ─────────────────────────────
export const organizations = pgTable("organizations", {
  id: id(), name: text("name").notNull(), slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("church"), status: text("status").notNull().default("active"),
  contactEmail: text("contact_email"), country: text("country"), logoAssetId: uuid("logo_asset_id"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: created(),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email"), username: text("username"),
  fullName: text("full_name").notNull(), displayName: text("display_name").notNull(),
  gameAlias: text("game_alias"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<Role>().notNull(),
  status: text("status").notNull().default("active"), // active | pending | suspended | deactivated
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  orgId: uuid("org_id").references(() => organizations.id),
  classLevelSlug: text("class_level_slug"), ageBand: text("age_band"),
  phone: text("phone"), relationship: text("relationship"), teachingRole: text("teaching_role"),
  linkCode: text("link_code"),
  emailVerifiedAt: ts("email_verified_at"), lastLoginAt: ts("last_login_at"),
  failedLogins: integer("failed_logins").notNull().default(0), lockedUntil: ts("locked_until"),
  totpSecret: text("totp_secret"), totpEnabled: boolean("totp_enabled").notNull().default(false),
  deletionRequestedAt: ts("deletion_requested_at"),
  createdAt: created(), updatedAt: updated(),
}, (t) => [
  uniqueIndex("users_email_uq").on(sql`lower(${t.email})`),
  uniqueIndex("users_username_uq").on(sql`lower(${t.username})`),
  uniqueIndex("users_linkcode_uq").on(t.linkCode),
  index("users_role_idx").on(t.role), index("users_org_idx").on(t.orgId),
]);

export const sessions = pgTable("sessions", {
  id: id(), tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ip: text("ip"), userAgent: text("user_agent"),
  createdAt: created(), expiresAt: ts("expires_at").notNull(), revokedAt: ts("revoked_at"),
  recentAuthAt: ts("recent_auth_at").notNull().defaultNow(), mfaOk: boolean("mfa_ok").notNull().default(false),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const passwordResets = pgTable("password_resets", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(), purpose: text("purpose").notNull().default("reset"), expiresAt: ts("expires_at").notNull(), usedAt: ts("used_at"), createdAt: created(),
});

export const parentLinks = pgTable("parent_links", {
  id: id(), parentId: uuid("parent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), createdAt: created(),
}, (t) => [uniqueIndex("parent_links_uq").on(t.parentId, t.studentId)]);

export const accessKeys = pgTable("access_keys", {
  id: id(), keyHash: text("key_hash").notNull().unique(), prefix: text("prefix").notNull(), label: text("label").notNull(),
  purpose: text("purpose").notNull().default("registration"), // registration | scholarship
  role: text("role").$type<Role>(), planId: uuid("plan_id"), orgId: uuid("org_id").references(() => organizations.id),
  classLevelSlug: text("class_level_slug"), grantDays: integer("grant_days"),
  maxUses: integer("max_uses").notNull().default(1), uses: integer("uses").notNull().default(0),
  expiresAt: ts("expires_at"), revokedAt: ts("revoked_at"), createdBy: uuid("created_by"), createdAt: created(),
});

export const consents = pgTable("consents", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), version: text("version").notNull(), givenBy: text("given_by"), createdAt: created(),
});

// ───────────────────────────── plans, payments, entitlements ─────────────────────────────
export const plans = pgTable("plans", {
  id: id(), slug: text("slug").notNull().unique(), name: text("name").notNull(),
  audience: text("audience").notNull(), // student | family | teacher | organisation
  description: text("description").notNull().default(""),
  priceMinor: integer("price_minor").notNull().default(0), currency: text("currency").notNull().default("NGN"),
  intervalDays: integer("interval_days").notNull().default(30), periodLabel: text("period_label").notNull().default("month"),
  maxChildren: integer("max_children").notNull().default(1), maxSeats: integer("max_seats").notNull().default(1),
  features: jsonb("features").$type<string[]>().notNull().default([]), trialDays: integer("trial_days").notNull().default(0),
  active: boolean("active").notNull().default(true), isDraft: boolean("is_draft").notNull().default(false),
  sort: integer("sort").notNull().default(0), createdAt: created(), updatedAt: updated(),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(), userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), orgId: uuid("org_id").references(() => organizations.id),
  planId: uuid("plan_id").references(() => plans.id), planName: text("plan_name").notNull(),
  status: text("status").notNull().default("active"), // active | suspended | revoked  (expiry is derived from endsAt)
  source: text("source").notNull(), // payment | scholarship | access_key | admin | trial
  startsAt: ts("starts_at").notNull(), endsAt: ts("ends_at").notNull(),
  maxChildren: integer("max_children").notNull().default(1), seats: integer("seats").notNull().default(1),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  paymentId: uuid("payment_id"), reason: text("reason"), createdBy: uuid("created_by"), createdAt: created(),
}, (t) => [index("subs_user_idx").on(t.userId), index("subs_org_idx").on(t.orgId)]);

export const payments = pgTable("payments", {
  id: id(), reference: text("reference").notNull().unique(), userId: uuid("user_id").notNull().references(() => users.id),
  planId: uuid("plan_id").notNull().references(() => plans.id), forStudentId: uuid("for_student_id"),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(), provider: text("provider").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed | abandoned | refunded | disputed
  providerRef: text("provider_ref"), subscriptionId: uuid("subscription_id"), verifiedAt: ts("verified_at"),
  note: text("note"), createdAt: created(), updatedAt: updated(),
}, (t) => [index("payments_user_idx").on(t.userId)]);

export const webhookEvents = pgTable("webhook_events", {
  id: id(), provider: text("provider").notNull(), eventKey: text("event_key").notNull(), kind: text("kind"), receivedAt: created(),
}, (t) => [uniqueIndex("webhook_events_uq").on(t.provider, t.eventKey)]);

// ───────────────────────────── curriculum ─────────────────────────────
export const classLevels = pgTable("class_levels", {
  id: id(), slug: text("slug").notNull().unique(), name: text("name").notNull(), sort: integer("sort").notNull(),
  stage: text("stage").notNull(), ageBand: text("age_band").notNull(), title: text("title").notNull(),
  overview: text("overview").notNull(), purpose: text("purpose").notNull().default(""),
  objectives: jsonb("objectives").$type<string[]>().notNull().default([]), depth: text("depth").notNull().default("foundation"),
  assessmentRubric: jsonb("assessment_rubric").$type<{ criterion: string; description: string }[]>().notNull().default([]),
  parentSupport: text("parent_support").notNull().default(""), teacherPrep: text("teacher_prep").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
});

export const topics = pgTable("topics", {
  id: id(), classLevelId: uuid("class_level_id").notNull().references(() => classLevels.id), termNo: integer("term_no").notNull().default(1),
  sort: integer("sort").notNull(), title: text("title").notNull(), primaryRef: text("primary_ref"),
  archived: boolean("archived").notNull().default(false),
}, (t) => [index("topics_class_idx").on(t.classLevelId)]);

export type LessonBody = {
  objectives?: string[]; background?: string; explanation?: string; keyWords?: { word: string; meaning: string }[];
  application?: string; discussion?: string[]; activity?: string; homework?: string; practical?: string; vocabulary?: string[];
  scriptureSummary?: string;
};
export type TeacherNotes = { preparation?: string; notes?: string; advanced?: string; rubric?: string };

export const lessons = pgTable("lessons", {
  id: id(), topicId: uuid("topic_id").references(() => topics.id), classLevelId: uuid("class_level_id").notNull().references(() => classLevels.id),
  slug: text("slug").notNull().unique(), title: text("title").notNull(), sort: integer("sort").notNull().default(0),
  contentLevel: text("content_level").notNull().default("framework"), // framework | complete
  status: text("status").$type<ContentStatus>().notNull().default("draft"),
  reviewStatus: text("review_status").$type<ReviewStatus>().notNull().default("unreviewed"),
  origin: text("origin").notNull().default("authored"), // authored | ai_drafted | imported
  isFree: boolean("is_free").notNull().default(false), publishAt: ts("publish_at"),
  refs: jsonb("refs").$type<string[]>().notNull().default([]), memoryVerseRef: text("memory_verse_ref"),
  body: jsonb("body").$type<LessonBody>().notNull().default({}),
  teacherNotes: jsonb("teacher_notes").$type<TeacherNotes>().notNull().default({}),
  parentNotes: text("parent_notes").notNull().default(""),
  prerequisiteId: uuid("prerequisite_id"), authorId: uuid("author_id"), reviewerId: uuid("reviewer_id"),
  editorialNotes: text("editorial_notes").notNull().default(""), sources: jsonb("sources").$type<string[]>().notNull().default([]),
  version: integer("version").notNull().default(1), createdAt: created(), updatedAt: updated(),
}, (t) => [index("lessons_class_idx").on(t.classLevelId), index("lessons_status_idx").on(t.status)]);

export const lessonVersions = pgTable("lesson_versions", {
  id: id(), lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  version: integer("version").notNull(), snapshot: jsonb("snapshot").notNull(), editedBy: uuid("edited_by"), createdAt: created(),
});

export const lessonProgress = pgTable("lesson_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("started"), completedAt: ts("completed_at"), updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

// ───────────────────────────── stories & media ─────────────────────────────
export type Scene = { title: string; text: string; narration?: string; ref?: string; art?: string; assetId?: string; alt?: string; caption?: string; kind?: "narration" | "dialogue" | "scripture" };
export const stories = pgTable("stories", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(), subtitle: text("subtitle").notNull().default(""),
  isTemplate: boolean("is_template").notNull().default(false), templateOfId: uuid("template_of_id"),
  testament: text("testament").notNull().default("OT"), books: jsonb("books").$type<string[]>().notNull().default([]),
  passageRef: text("passage_ref").notNull(), classSlugs: jsonb("class_slugs").$type<string[]>().notNull().default([]),
  genre: text("genre").notNull().default("narrative"),
  status: text("status").$type<ContentStatus>().notNull().default("draft"),
  reviewStatus: text("review_status").$type<ReviewStatus>().notNull().default("unreviewed"),
  visibility: text("visibility").notNull().default("members"), // public | members
  summary: text("summary").notNull().default(""),
  scenes: jsonb("scenes").$type<Scene[]>().notNull().default([]),
  memoryVerseRef: text("memory_verse_ref"), discussion: jsonb("discussion").$type<string[]>().notNull().default([]),
  detail: jsonb("detail").$type<Record<string, string | string[]>>().notNull().default({}),
  authorId: uuid("author_id"), orgId: uuid("org_id"), version: integer("version").notNull().default(1),
  coverArt: text("cover_art"), coverAssetId: uuid("cover_asset_id"),
  createdAt: created(), updatedAt: updated(),
}, (t) => [index("stories_status_idx").on(t.status)]);

export const storyVersions = pgTable("story_versions", {
  id: id(), storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  version: integer("version").notNull(), snapshot: jsonb("snapshot").notNull(), editedBy: uuid("edited_by"), createdAt: created(),
});

export const mediaAssets = pgTable("media_assets", {
  id: id(), kind: text("kind").notNull(), mime: text("mime").notNull(), filename: text("filename").notNull(),
  data: bytea("data").notNull(), size: integer("size").notNull(),
  alt: text("alt").notNull().default(""), caption: text("caption").notNull().default(""),
  sourceUrl: text("source_url"), creator: text("creator"), licence: text("licence"), attribution: text("attribution"),
  permittedUse: text("permitted_use"), retrievedAt: ts("retrieved_at"), generationRecord: text("generation_record"),
  isPublic: boolean("is_public").notNull().default(true), uploadedBy: uuid("uploaded_by"), orgId: uuid("org_id"),
  deletedAt: ts("deleted_at"), createdAt: created(),
});

export const importLogs = pgTable("import_logs", {
  id: id(), kind: text("kind").notNull(), filename: text("filename"), userId: uuid("user_id"),
  summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}), createdAt: created(),
});

// ───────────────────────────── CBT & games ─────────────────────────────
export type QOption = { id: string; text: string; correct?: boolean };
export const questions = pgTable("questions", {
  id: id(), type: text("type").notNull().default("mcq"), // mcq | tf | multi | fill | short | essay | order
  text: text("text").notNull(), options: jsonb("options").$type<QOption[]>().notNull().default([]),
  acceptedAnswers: jsonb("accepted_answers").$type<string[]>().notNull().default([]), rubric: text("rubric"),
  explanation: text("explanation").notNull().default(""), ref: text("ref"),
  classLevelSlug: text("class_level_slug"), classMin: integer("class_min"), classMax: integer("class_max"), topic: text("topic"), lessonId: uuid("lesson_id"), storyId: uuid("story_id"),
  difficulty: integer("difficulty").notNull().default(2), objective: text("objective"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]), marks: integer("marks").notNull().default(1),
  status: text("status").$type<ContentStatus>().notNull().default("published"),
  imageAssetId: uuid("image_asset_id"), source: text("source"), licence: text("licence"),
  authorId: uuid("author_id"), reviewerId: uuid("reviewer_id"), orgId: uuid("org_id"), isFree: boolean("is_free").notNull().default(false),
  createdAt: created(), updatedAt: updated(),
}, (t) => [index("questions_class_idx").on(t.classLevelSlug), index("questions_status_idx").on(t.status)]);

export type ExamRule = { classLevelSlug?: string; topic?: string; tag?: string; lessonId?: string; difficulty?: number; count: number };
export const exams = pgTable("exams", {
  id: id(), title: text("title").notNull(), kind: text("kind").notNull().default("practice"), description: text("description").notNull().default(""),
  classLevelSlug: text("class_level_slug"), orgId: uuid("org_id"), groupId: uuid("group_id"), createdBy: uuid("created_by"),
  status: text("status").notNull().default("draft"), // draft | published | closed
  durationMin: integer("duration_min").notNull().default(20),
  rules: jsonb("rules").$type<ExamRule[]>().notNull().default([]), fixedQuestionIds: jsonb("fixed_question_ids").$type<string[]>().notNull().default([]),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(true), shuffleOptions: boolean("shuffle_options").notNull().default(true),
  maxAttempts: integer("max_attempts").notNull().default(1), opensAt: ts("opens_at"), closesAt: ts("closes_at"),
  releaseResults: text("release_results").notNull().default("immediate"), // immediate | after_close | manual
  showExplanations: boolean("show_explanations").notNull().default(true), passMark: integer("pass_mark").notNull().default(50),
  isFree: boolean("is_free").notNull().default(false), resultsReleased: boolean("results_released").notNull().default(false),
  createdAt: created(), updatedAt: updated(),
});

export type QuestionSlot = { qid: string; order: string[] };
export const examAttempts = pgTable("exam_attempts", {
  id: id(), examId: uuid("exam_id").notNull().references(() => exams.id), userId: uuid("user_id").notNull().references(() => users.id),
  attemptNo: integer("attempt_no").notNull().default(1), status: text("status").notNull().default("in_progress"), // in_progress | submitted | marked
  startedAt: ts("started_at").notNull().defaultNow(), deadlineAt: ts("deadline_at").notNull(), submittedAt: ts("submitted_at"),
  slots: jsonb("slots").$type<QuestionSlot[]>().notNull().default([]),
  score: integer("score"), maxScore: integer("max_score"), percent: integer("percent"), needsManual: boolean("needs_manual").notNull().default(false),
  autoSubmitted: boolean("auto_submitted").notNull().default(false),
}, (t) => [index("attempts_user_idx").on(t.userId), uniqueIndex("attempts_no_uq").on(t.examId, t.userId, t.attemptNo)]);

export const examResponses = pgTable("exam_responses", {
  attemptId: uuid("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id),
  answer: jsonb("answer").$type<string | string[] | null>(), flagged: boolean("flagged").notNull().default(false),
  correct: boolean("correct"), marks: integer("marks"), feedback: text("feedback"), updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })]);

export const gameSessions = pgTable("game_sessions", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), gameKey: text("game_key").notNull(),
  classLevelSlug: text("class_level_slug"), items: jsonb("items").$type<unknown[]>().notNull().default([]),
  answered: jsonb("answered").$type<Record<string, boolean>>().notNull().default({}),
  score: integer("score").notNull().default(0), total: integer("total").notNull().default(0), streak: integer("streak").notNull().default(0),
  startedAt: ts("started_at").notNull().defaultNow(), finishedAt: ts("finished_at"),
}, (t) => [index("games_user_idx").on(t.userId), index("games_key_idx").on(t.gameKey)]);

export const timelineEvents = pgTable("timeline_events", {
  id: id(), slug: text("slug").notNull().unique(), era: text("era").notNull(), sort: integer("sort").notNull(), title: text("title").notNull(),
  ref: text("ref").notNull(), summary: text("summary").notNull(), people: jsonb("people").$type<string[]>().notNull().default([]),
  places: jsonb("places").$type<string[]>().notNull().default([]), dateLabel: text("date_label").notNull().default(""),
  dateBasis: text("date_basis").notNull().default("narrative"), // narrative | proposed | uncertain
  confidence: text("confidence").notNull().default(""), theology: text("theology").notNull().default(""),
  evidence: jsonb("evidence").$type<{ item: string; level: string; note: string }[]>().notNull().default([]),
  lessonSlugs: jsonb("lesson_slugs").$type<string[]>().notNull().default([]), art: text("art"), status: text("status").notNull().default("published"),
});

// ───────────────────────────── teaching operations ─────────────────────────────
export const classGroups = pgTable("class_groups", {
  id: id(), orgId: uuid("org_id").notNull().references(() => organizations.id), name: text("name").notNull(),
  classLevelSlug: text("class_level_slug").notNull(), termNo: integer("term_no").notNull().default(1), active: boolean("active").notNull().default(true), createdAt: created(),
});
export const groupTeachers = pgTable("group_teachers", {
  groupId: uuid("group_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.groupId, t.teacherId] })]);
export const groupStudents = pgTable("group_students", {
  groupId: uuid("group_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.groupId, t.studentId] })]);
export const attendanceSessions = pgTable("attendance_sessions", {
  id: id(), groupId: uuid("group_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }), date: text("date").notNull(),
  takenBy: uuid("taken_by"), createdAt: created(),
}, (t) => [uniqueIndex("attendance_day_uq").on(t.groupId, t.date)]);
export const attendanceMarks = pgTable("attendance_marks", {
  sessionId: uuid("session_id").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }), status: text("status").notNull(),
}, (t) => [primaryKey({ columns: [t.sessionId, t.studentId] })]);
export const assignments = pgTable("assignments", {
  id: id(), groupId: uuid("group_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // lesson | exam | story
  refId: uuid("ref_id").notNull(), title: text("title").notNull(), instructions: text("instructions").notNull().default(""),
  dueAt: ts("due_at"), createdBy: uuid("created_by"), createdAt: created(),
});
export const trainingModules = pgTable("training_modules", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(), summary: text("summary").notNull(),
  body: text("body").notNull(), sort: integer("sort").notNull().default(0), status: text("status").notNull().default("published"),
});
export const trainingProgress = pgTable("training_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }), completedAt: ts("completed_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId] })]);

// ───────────────────────────── site content & branding ─────────────────────────────
export const settings = pgTable("settings", {
  key: text("key").primaryKey(), value: jsonb("value").$type<unknown>().notNull(), updatedBy: uuid("updated_by"), updatedAt: updated(),
});
export const pages = pgTable("pages", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(), kind: text("kind").notNull().default("page"),
  status: text("status").notNull().default("draft"), seoTitle: text("seo_title"), seoDescription: text("seo_description"),
  ogAssetId: uuid("og_asset_id"), publishAt: ts("publish_at"), showInNav: boolean("show_in_nav").notNull().default(false),
  archivedAt: ts("archived_at"), updatedAt: updated(), createdAt: created(),
});
export const pageSections = pgTable("page_sections", {
  id: id(), pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }), sort: integer("sort").notNull().default(0),
  type: text("type").notNull(), hidden: boolean("hidden").notNull().default(false), audience: text("audience").notNull().default("all"),
  draft: jsonb("draft").$type<Record<string, unknown>>().notNull().default({}), published: jsonb("published").$type<Record<string, unknown> | null>(),
  publishedHidden: boolean("published_hidden"), publishedSort: integer("published_sort"),
  deletedAt: ts("deleted_at"), updatedAt: updated(),
}, (t) => [index("sections_page_idx").on(t.pageId)]);
export const contentVersions = pgTable("content_versions", {
  id: id(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), snapshot: jsonb("snapshot").notNull(),
  changedBy: uuid("changed_by"), note: text("note"), createdAt: created(),
}, (t) => [index("cv_entity_idx").on(t.entityType, t.entityId)]);
export const ministryWings = pgTable("ministry_wings", {
  id: id(), slug: text("slug").notNull().unique(), code: text("code").notNull(), name: text("name").notNull(),
  kind: text("kind").notNull().default("wing"), constituency: text("constituency").notNull().default(""),
  tagline: text("tagline").notNull().default(""), description: text("description").notNull().default(""),
  vision: text("vision").notNull().default(""), mission: text("mission").notNull().default(""),
  activities: jsonb("activities").$type<string[]>().notNull().default([]), audience: text("audience").notNull().default(""),
  logoId: uuid("logo_id"), imageAssetId: uuid("image_asset_id"), contactEmail: text("contact_email"), registrationUrl: text("registration_url"),
  acceptsRegistration: boolean("accepts_registration").notNull().default(false), body: text("body").notNull().default(""),
  status: text("status").notNull().default("published"), sort: integer("sort").notNull().default(0), createdAt: created(),
});
export const logos = pgTable("logos", {
  id: id(), name: text("name").notNull(), collection: text("collection").notNull().default("CROP"), ministrySlug: text("ministry_slug"),
  kind: text("kind").notNull(), // horizontal | stacked | emblem | compact | favicon | app-icon | print | parent
  variant: text("variant").notNull().default("light"), // light | dark | mono | transparent
  mime: text("mime").notNull(), svg: text("svg"), assetId: uuid("asset_id"), builtinPath: text("builtin_path"),
  placements: jsonb("placements").$type<string[]>().notNull().default([]), isPrimary: boolean("is_primary").notNull().default(false),
  isDefaultCrop: boolean("is_default_crop").notNull().default(false), active: boolean("active").notNull().default(true), createdAt: created(),
});
export const faqs = pgTable("faqs", {
  id: id(), category: text("category").notNull().default("General"), question: text("question").notNull(), answer: text("answer").notNull(),
  sort: integer("sort").notNull().default(0), status: text("status").notNull().default("published"),
});
export const events = pgTable("events", {
  id: id(), title: text("title").notNull(), kind: text("kind").notNull().default("event"), startsAt: ts("starts_at"), endsAt: ts("ends_at"),
  location: text("location"), description: text("description").notNull().default(""), registrationUrl: text("registration_url"),
  status: text("status").notNull().default("draft"), createdAt: created(),
});
export const testimonials = pgTable("testimonials", {
  id: id(), name: text("name").notNull(), role: text("role"), body: text("body").notNull(), consentRecorded: boolean("consent_recorded").notNull().default(false),
  status: text("status").notNull().default("draft"), createdAt: created(),
});
export const enquiries = pgTable("enquiries", {
  id: id(), name: text("name").notNull(), email: text("email").notNull(), subject: text("subject"), message: text("message").notNull(),
  status: text("status").notNull().default("new"), createdAt: created(),
});
export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(), name: text("name").notNull(), subject: text("subject").notNull(), body: text("body").notNull(), updatedAt: updated(),
});
export const emailOutbox = pgTable("email_outbox", {
  id: id(), toEmail: text("to_email").notNull(), templateKey: text("template_key"), subject: text("subject").notNull(), html: text("html").notNull(),
  status: text("status").notNull().default("held"), // held (no provider) | sent | failed
  providerId: text("provider_id"), error: text("error"), createdAt: created(), sentAt: ts("sent_at"),
});
export const notifications = pgTable("notifications", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), title: text("title").notNull(), body: text("body").notNull().default(""),
  href: text("href"), readAt: ts("read_at"), createdAt: created(),
}, (t) => [index("notif_user_idx").on(t.userId)]);

// ───────────────────────────── operations ─────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: id(), actorId: uuid("actor_id"), actorLabel: text("actor_label"), actorRole: text("actor_role"), action: text("action").notNull(),
  targetType: text("target_type"), targetId: text("target_id"), meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  ip: text("ip"), plane: text("plane").notNull().default("app"), // app | softnet
  createdAt: created(),
}, (t) => [index("audit_action_idx").on(t.action), index("audit_created_idx").on(t.createdAt)]);
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull().default(0), windowStart: ts("window_start").notNull().defaultNow(),
});
export const dataRequests = pgTable("data_requests", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), kind: text("kind").notNull(),
  status: text("status").notNull().default("open"), note: text("note"), createdAt: created(), handledAt: ts("handled_at"),
});
export const creditLedger = pgTable("credit_ledger", {
  id: id(), projectId: uuid("project_id"), userId: uuid("user_id"), kind: text("kind").notNull(), // grant | reserve | charge | refund
  credits: integer("credits").notNull(), idempotencyKey: text("idempotency_key").notNull().unique(), note: text("note"), createdAt: created(),
});
export const videoProjects = pgTable("video_projects", {
  id: id(), storyId: uuid("story_id").references(() => stories.id), title: text("title").notNull(),
  stage: text("stage").notNull().default("script"), // script | script_approved | storyboard | cost_review | confirmed | generating | assembling | review | done | failed
  script: text("script").notNull().default(""), storyboard: jsonb("storyboard").$type<{ scene: number; prompt: string; seconds: number }[]>().notNull().default([]),
  aspect: text("aspect").notNull().default("16:9"), estimatedCredits: integer("estimated_credits").notNull().default(0),
  provider: text("provider"), createdBy: uuid("created_by"), createdAt: created(), updatedAt: updated(),
});
export const videoJobs = pgTable("video_jobs", {
  id: id(), projectId: uuid("project_id").notNull().references(() => videoProjects.id, { onDelete: "cascade" }), scene: integer("scene").notNull(),
  status: text("status").notNull().default("queued"), attempts: integer("attempts").notNull().default(0), error: text("error"),
  outputAssetId: uuid("output_asset_id"), createdAt: created(),
});
