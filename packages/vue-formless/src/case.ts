/** `name` → `Name`, `idCard` → `IdCard` */
export function camelToPascal(key: string): string {
  if (!key) return key
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** `Name` → `name`, `IdCard` → `idCard` */
export function pascalToCamel(key: string): string {
  if (!key) return key
  return key.charAt(0).toLowerCase() + key.slice(1)
}

export type CamelToPascal<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S
