/** Default branded e-mail templates. Editable in Admin > E-mail templates. Variables use {{name}} and are HTML-escaped. */
export interface EmailDefault { key: string; name: string; subject: string; body: string; vars: string[] }

export const EMAIL_DEFAULTS: EmailDefault[] = [
  { key: "welcome", name: "Registration welcome", vars: ["name", "loginUrl"], subject: "Welcome to {{siteName}}",
    body: "Hello {{name}},\n\nYour account has been created. You can sign in here: {{loginUrl}}\n\nBible learning content opens as soon as your subscription is confirmed.\n\nGrace and peace," },
  { key: "verify", name: "Account verification", vars: ["name", "link"], subject: "Please confirm your e-mail address",
    body: "Hello {{name}},\n\nPlease confirm your e-mail address by opening this link (valid for 24 hours):\n{{link}}\n\nIf you did not register, you can ignore this message." },
  { key: "password_reset", name: "Password reset", vars: ["name", "link", "minutes"], subject: "Reset your password",
    body: "Hello {{name}},\n\nWe received a request to reset your password. Open this link within {{minutes}} minutes (it works once):\n{{link}}\n\nIf you did not ask for this, ignore this e-mail. Your password will not change." },
  { key: "password_changed", name: "Password changed confirmation", vars: ["name"], subject: "Your password was changed",
    body: "Hello {{name}},\n\nYour password was just changed. If this was not you, reset it immediately and contact support." },
  { key: "payment_receipt", name: "Payment confirmation", vars: ["name", "plan", "amount", "reference", "endsAt"], subject: "Payment received: {{plan}}",
    body: "Hello {{name}},\n\nThank you. Your payment of {{amount}} for {{plan}} was verified.\nReference: {{reference}}\nAccess runs until: {{endsAt}}.\n\nGod bless you." },
  { key: "subscription_expiry", name: "Subscription expiry reminder", vars: ["name", "plan", "endsAt", "plansUrl"], subject: "Your {{plan}} plan ends soon",
    body: "Hello {{name}},\n\nYour {{plan}} access ends on {{endsAt}}. Renew here to keep learning without a break: {{plansUrl}}\n\nYour learners' progress is always kept." },
  { key: "teacher_invitation", name: "Teacher invitation", vars: ["name", "organisation", "link"], subject: "You are invited to teach with {{organisation}}",
    body: "Hello {{name}},\n\n{{organisation}} has invited you to join as a Sunday School teacher. Register with your invitation here: {{link}}" },
  { key: "teacher_approved", name: "Teacher approved", vars: ["name", "loginUrl"], subject: "Your teacher account is approved",
    body: "Hello {{name}},\n\nYour teacher account has been approved. Sign in: {{loginUrl}}" },
  { key: "assignment", name: "New assignment", vars: ["name", "title", "due", "link"], subject: "New assignment: {{title}}",
    body: "Hello {{name}},\n\nA new assignment has been set: {{title}}\nDue: {{due}}\nOpen it here: {{link}}" },
  { key: "admin_notice", name: "Administrative notice", vars: ["name", "message"], subject: "Notice from {{siteName}}",
    body: "Hello {{name}},\n\n{{message}}" },
];
