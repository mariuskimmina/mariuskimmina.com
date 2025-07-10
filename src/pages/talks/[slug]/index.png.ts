import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { generateOgImageForPost } from "@utils/generateOgImages";

export async function getStaticPaths() {
  const talks = await getCollection("talks").then(t =>
    t.filter(({ data }) => !data.ogImage)
  );

  return talks.map(talk => ({
    params: { slug: talk.slug },
    props: talk,
  }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(
    await generateOgImageForPost(props as CollectionEntry<"talks">),
    {
      headers: { "Content-Type": "image/png" },
    }
  );
