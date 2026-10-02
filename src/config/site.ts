export const site = {
  name: 'Diseño Creativo',
  shortName: 'DC',
  description: 'Diseño web y contenido visual para que tu marca se entienda, se reconozca y tenga una presencia cuidada.',
  url: import.meta.env.PUBLIC_SITE_URL || '',
  email: import.meta.env.PUBLIC_CONTACT_EMAIL || '',
  whatsapp: import.meta.env.PUBLIC_WHATSAPP_URL || '',
  locations: ['México', 'España'],
  socials: [] as Array<{ label: string; url: string }>,
  form: {
    enabled: false,
    showBudget: true,
    budgetOptions: ['Por definir', 'Quiero orientación', 'Tengo una cifra y la contaré en el mensaje'],
  },
  testimonialsEnabled: false,
  team: [] as Array<{ name: string; role: string; bio?: string; image?: string }>,
  navigation: [
    { label: 'Servicios', href: '/servicios' },
    { label: 'Proyectos', href: '/proyectos' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Contacto', href: '/contacto' },
  ],
} as const;

export type SiteConfig = typeof site;
