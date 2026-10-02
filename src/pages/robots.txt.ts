import type { APIRoute } from 'astro';
import { site } from '../config/site';
export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\n${site.url ? `Sitemap: ${site.url}/sitemap.xml\n` : ''}`, { headers: { 'Content-Type': 'text/plain' } });
