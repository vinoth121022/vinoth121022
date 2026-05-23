export const authModule = {
  id: "auth",
  owns: ["login", "signup", "google-login", "email-otp", "session-persistence", "auth-gate"],
} as const;
