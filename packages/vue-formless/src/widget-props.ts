import type { ControlVModel } from './control-model'

/**
 * Public `$props` of a Vue constructor, functional component, or SFC.
 * `never` / omitted widgets yield `{}` (`never extends Constructor` is true in TS).
 */
export type ComponentPublicProps<C> = [C] extends [never]
  ? {}
  : [C] extends [undefined]
    ? {}
    : C extends abstract new (...args: any) => { $props: infer P }
      ? P
      : C extends (props: infer P, ...args: any) => unknown
        ? P
        : C extends { $props: infer P }
          ? P
          : {}

/**
 * v-model ports locked on the tag (ADR-011). Schema `model` wins;
 * omitted `model` locks the default `'modelValue'`.
 * Widened `string[]` is not treated as port names (would Omit every string key).
 */
type SchemaModel<Def> = Def extends { model: infer M } ? M : undefined

type ModelPortNames<M> = [M] extends [undefined]
  ? 'modelValue'
  : M extends string
    ? M
    : M extends readonly [infer F extends string, ...infer R]
      ? F | ModelPortNames<R>
      : 'modelValue'

export type LockedVModelKeys<M extends ControlVModel | undefined> =
  | ModelPortNames<M>
  | `onUpdate:${ModelPortNames<M>}`

type LockedKeysForDef<Def> = LockedVModelKeys<
  SchemaModel<Def> extends ControlVModel | undefined ? SchemaModel<Def> : undefined
>

/** Widget props that may appear on `<User.Xxx />` (v-model ports stripped). */
export type WidgetTagProps<Def> = Def extends { component?: infer C }
  ? [Exclude<C, undefined>] extends [never]
    ? {}
    : Omit<ComponentPublicProps<Exclude<C, undefined>>, LockedKeysForDef<Def>>
  : {}
