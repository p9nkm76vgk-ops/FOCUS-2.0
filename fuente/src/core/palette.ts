/** Paleta y color por asignatura, CENTRALIZADOS. Color efectivo = personalizado (userColor) > predeterminado por clave > color heredado (`color`). */
// Paleta apagada y cálida (la de siempre): colores sobrios que no gritan sobre el fondo oscuro. El nombre de la asignatura siempre va junto al color.
export const DEFAULT_SUBJECT_COLORS: Record<string, string> = {
  'Matemáticas II': '#4A7BA3', 'Física': '#7B6AA0', 'Química': '#4E8B6E', 'Business': '#A97C20', 'Lengua Castellana': '#A9526A',
  'Catalán': '#C26A3D', 'Inglés': '#3E8C8E', 'Historia de España': '#8B5E3C', 'Historia de la Filosofía': '#7A746B',
};
export const SPARE_COLORS = ['#5B8F5A', '#C09A3E', '#5A8FB8', '#B07A5C', '#8F72B0', '#7E8A52'];
type S = { id?: string; color?: string; colorKey?: string; userColor?: string };
export const effectiveColor = (s: S): string => s.userColor ?? (s.colorKey ? DEFAULT_SUBJECT_COLORS[s.colorKey] : undefined) ?? s.color ?? '#7A746B';
export const nextSpare = (used: string[]): string => SPARE_COLORS.find(c => !used.map(u => u.toLowerCase()).includes(c.toLowerCase())) ?? '#7A746B';
/** ¿Otro asignatura ya usa este color? (cada asignatura debe tener un color único). */
export const colorConflict = (subjects: S[], id: string | undefined, color: string): boolean => subjects.some(s => s.id !== id && effectiveColor(s).toLowerCase() === color.toLowerCase());
export const resetColors = <T extends S>(subjects: T[]): T[] => subjects.map(s => { const { userColor, ...rest } = s as any; return rest as T; });
