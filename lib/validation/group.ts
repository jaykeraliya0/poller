import { z } from "zod";

export const GROUP_NAME_MAX = 60;

export const groupNameSchema = z
  .string({ error: "Enter a group name" })
  .trim()
  .min(1, "Enter a group name")
  .max(GROUP_NAME_MAX, `Name must be ${GROUP_NAME_MAX} characters or fewer`);
