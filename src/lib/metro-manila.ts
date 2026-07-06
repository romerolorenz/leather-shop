export const METRO_MANILA_CITIES = [
  "Caloocan",
  "Las Piñas",
  "Makati",
  "Malabon",
  "Mandaluyong",
  "Manila",
  "Marikina",
  "Muntinlupa",
  "Navotas",
  "Parañaque",
  "Pasay",
  "Pasig",
  "Pateros",
  "Quezon City",
  "San Juan",
  "Taguig",
  "Valenzuela",
] as const;

export type MetroManilaCity = (typeof METRO_MANILA_CITIES)[number];

export function isMetroManilaCity(value: string): value is MetroManilaCity {
  return (METRO_MANILA_CITIES as readonly string[]).includes(value);
}
