import type { FieldSchema } from './field-schema'

export type FieldSchemaInput = Omit<FieldSchema, 'component'> & {
  component?: unknown
}

export type FieldFactoryInput = FieldSchemaInput & {
  /** Debug-only component name; omit when the schema always declares `prop`. */
  name?: string
}
