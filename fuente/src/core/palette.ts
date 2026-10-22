/** Paleta y color por asignatura, CENTRALIZADOS. Color efectivo = personalizado (userColor) > predeterminado por clave > color heredado (`color`). */
// Paleta v17: 9 tonos repartidos por la rueda de color y con luminosidad algo distinta (diferencia de color ΔE76 mínima entre pares ≈ 40; antes ≈ 18).
// Contraste ≥ 4,5:1 sobre el carbón y ≥ 3:1 sobre blanco; el nombre de la asignatura siempre va junto al color (no depende solo del color).
export const DEFAULT_SUBJECT_COLORS: Record<string, string> = {
  'Matemáticas II': '#0597FD', 'Física': '#8D77A8', 'Química': '#00A97E', 'Business': '#A4935F', 'Lengua Castellana': '#E468B8',
  'Catalán': '#C36925', 'Inglés': '#0790A4', 'Historia de España': '#EC5D6D', 'Historia de la Filosofía': '#5B8F22',
};
export const SPARE_COLORS = ['#8C7BD9', '#C9A227', '#4FA3C7', '#B8795C', '#6FA35A', '#C26E8E'];
type S = { id?: string; color?: string; colorKey?: string; userColor?: string };
export const effectiveColor = (s: S): string => s.userColor ?? (s.colorKey ? DEFAULT_SUBJECT_COLORS[s.colorKey] : undefined) ?? s.color ?? '#7A746B';
export const nextSpare = (used: string[]): string => SPARE_COLORS.find(c => !used.map(u => u.toLowerCase()).includes(c.toLowerCase())) ?? '#7A746B';
/** ¿Otro asignatura ya usa este color? (cada asignatura debe tener un color único). */
export const colorConflict = (subjects: S[], id: string | undefined, color: string): boolean => subjects.some(s => s.id !== id && effectiveColor(s).toLowerCase() === color.toLowerCase());
export const resetColors = <T extends S>(subjects: T[]): T[] => subjects.map(s => { const { userColor, ...rest } = s as any; return rest as T; });
