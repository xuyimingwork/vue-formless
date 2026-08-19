import { ElFormItem } from 'element-plus'
import { defineComponent, h, type PropType } from 'vue'
import type { ItemRenderInput } from 'vue-formless'
import { toEpItemProps } from './to-item-props'

/** Adapter Item: snapshot → ElFormItem. Kernel fills default with the input. */
export const EpItem = defineComponent({
  name: 'EpItem',
  inheritAttrs: false,
  props: {
    snapshot: {
      type: Object as PropType<ItemRenderInput>,
      required: true,
    },
  },
  setup(props, { slots, attrs }) {
    return () => h(ElFormItem, { ...toEpItemProps(props.snapshot), ...attrs }, slots)
  },
})
