import { defineCollection, z } from "astro:content";

const bulletSchema = z.union([
  z.string(),
  z.object({
    href: z.string().optional(),
    label: z.string().optional(),
    text: z.string(),
  }),
]);

const hallOfFame = defineCollection({
  type: "content",
  schema: z.object({
    year: z.number(),
    projects: z.array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        group: z.string().optional(),
        groupName: z.string().optional(),
        intro: z.string().optional(),
        description: z.string().optional(),
        extraParagraphs: z.array(z.string()).optional(),
        implementationTags: z.array(z.string()).optional(),
        bullets: z.array(bulletSchema),
        images: z.array(z.string()).optional(),
      }),
    ),
  }),
});

export const collections = {
  "hall-of-fame": hallOfFame,
};
