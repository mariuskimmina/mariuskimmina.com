/**
 * Extracts YouTube video ID from various YouTube URL formats and returns the thumbnail URL
 * @param url - YouTube video URL
 * @returns High quality thumbnail URL or null if not a valid YouTube URL
 */
export function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null;

  // Regular expression to match various YouTube URL formats
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(youtubeRegex);

  if (match && match[1]) {
    const videoId = match[1];
    // Return high quality thumbnail (maxresdefault for best quality, hqdefault as fallback)
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  return null;
}

/**
 * Extracts YouTube video ID from URL
 * @param url - YouTube video URL
 * @returns Video ID or null if not a valid YouTube URL
 */
export function getYoutubeVideoId(url: string): string | null {
  if (!url) return null;

  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(youtubeRegex);

  return match && match[1] ? match[1] : null;
}
