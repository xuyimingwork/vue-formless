import { createFormControls } from 'vue-formless'
import DateRangeOne from './DateRangeOne.vue'
import DateRangeTwo from './DateRangeTwo.vue'

const rangeValidation = {
  empty: { message: '请选择日期范围' },
}

export const Range = createFormControls({
  dateRangeOne: {
    label: '行程日期',
    component: DateRangeOne,
    model: ['start', 'end'],
    prop: ['startTime', 'endTime'],
    validation: rangeValidation,
  },
  dateRangeTwo: {
    label: '签证日期',
    component: DateRangeTwo,
    model: ['start', 'end'],
    prop: ['fromTime', 'toTime'],
    validation: rangeValidation,
    item: false,
    layout: false,
  },
})
