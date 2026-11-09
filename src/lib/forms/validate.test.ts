import { describe, expect, it } from "vitest";
import { validateAnswers } from "@/lib/forms/validate";

const schema = {
  fields: [
    { id: "name", type: "short_text" as const, label: "Name", required: true },
    { id: "email", type: "email" as const, label: "Email", required: true },
    { id: "agree", type: "checkbox" as const, label: "Agree", required: true },
  ],
};

describe("validateAnswers", () => {
  it("keeps only known answers and rejects a missing required field", () => {
    const result = validateAnswers(schema, { name: "Ada", email: "ada@example.com", extra: "<script>" });
    expect(result.ok).toBe(false);
    expect(result.answers).not.toHaveProperty("extra");
  });

  it("accepts a complete answer set", () => {
    const result = validateAnswers(schema, { name: "Ada", email: "ada@example.com", agree: true });
    expect(result.ok).toBe(true);
  });
});
