import { computed, defineComponent } from 'vue'
import { FormFieldCore, type FormFieldComponent } from './FormField'
import { isFieldMode } from './field-mode'
import { readControlFormless } from './control-config'
import type { FieldSchema, ItemFl } from './field-schema'
import { mergeAttrs, resolveProps } from './props-overlay'
import { FIELD_ATTR_CHANNELS, useDispatch } from './use-form-attrs'
import { upperFirst } from './utils'

export type FieldSchemaInput = Omit<FieldSchema, 'component'> & {
  component?: unknown
}

export type FieldFactoryInput = FieldSchemaInput & {
  /** Debug-only component name; omit when the schema always declares `prop`. */
  name?: string
}

// 组件的 model、field
// 预设的 model、

export function createFormFieldComponent(
  input: FieldFactoryInput,
): FormFieldComponent {
  const { name, ...schema } = input
  const { props, ...preset } = schema

  return defineComponent({
    name: name ? `FormField${upperFirst(name)}` : 'FormFieldNamed',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const tag = useDispatch(attrs as Record<string, unknown>, FIELD_ATTR_CHANNELS)

      const fl = computed(() => {
        const { component, ...fl } = tag.fl.value
        return Object.assign({}, preset, fl)
      })

      const control = (fl: ItemFl) => {
        return mergeAttrs(resolveProps(props, fl), tag.default.value)
      }
        

      return () => (
        <FormFieldCore
          fl={fl.value}
          layoutItem={tag.layoutItem.value}
          layout={tag.layout.value}
          item={tag.item.value}
          control={control}
          v-slots={slots}
        />
      )
    },
  }) as FormFieldComponent
}
