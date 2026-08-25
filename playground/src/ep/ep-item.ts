import { ElFormItem } from 'element-plus'
import { defineComponent, h, type PropType } from 'vue'
import type { ItemFl } from 'vue-formless'
import { toEpItemProps } from './to-item-props'

/** Adapter Item: `fl` → ElFormItem. Kernel fills default with the input. */
export const EpItem = defineComponent({
  name: 'EpItem',
  inheritAttrs: false,
  props: {
    fl: {
      type: Object as PropType<ItemFl>,
      required: true,
    },
  },
  setup(props, { slots, attrs }) {
    return () => h(ElFormItem, { ...toEpItemProps(props.fl), ...attrs }, slots)
  },
})
