import { SITE } from "@config";
import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      date: z.date(),
      title: z.string(),
      postSlug: z.string().optional(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image()
        .refine(img => img.width >= 1200 && img.height >= 630, {
          message: "OpenGraph image must be at least 1200 X 630 pixels!",
        })
        .or(z.string())
        .optional(),
      description: z.string().optional(),
      canonicalURL: z.string().optional(),
    }),
});

const talks = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      event: z.string(),
      date: z.date(),
      location: z.string(),
      description: z.string(),
      link: z.string().url().optional(),
      video: z.string().url().optional(),
      slides: z.string().url().optional(),
      featured: z.boolean().optional(),
      ogImage: image()
        .refine(img => img.width >= 1200 && img.height >= 630, {
          message: "OpenGraph image must be at least 1200 X 630 pixels!",
        })
        .or(z.string())
        .optional(),
    }),
});

export const collections = { posts, talks };
